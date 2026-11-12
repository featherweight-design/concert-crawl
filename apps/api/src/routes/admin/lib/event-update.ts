import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { endDelisting } from '@concert-crawl/db/upcoming-events';
import {
  db,
  events,
  notifications,
  userEvents,
  venues,
} from '@concert-crawl/db';
import { fanoutWatchNotification } from '@concert-crawl/push';

// The body of PATCH /v1/admin/events/:id: the transition rules and the
// watcher fan-out.
export const eventPatchSchema = z.object({
  verified: z.boolean().optional(),
  status: z.enum(['upcoming', 'cancelled', 'postponed']).optional(),
  title: z.string().min(1).optional(),
  artist: z.string().min(1).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
    .optional(),
  doorsTime: z.string().nullable().optional(),
  showTime: z.string().nullable().optional(),
  ticketPriceMin: z.string().nullable().optional(),
  ticketPriceMax: z.string().nullable().optional(),
  genre: z.array(z.string()).nullable().optional(),
  // #992 — the tour kicker is only ever auto-populated on the LLM
  // extraction path, so a JSON-LD venue needs an admin to set it. A blank
  // (or whitespace-only) string clears the value to NULL rather than
  // persisting '' — the consumer UI keys the kicker off `tourName !== null`.
  tourName: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional()
    .transform((value) => {
      if (value === null || value === undefined) return value;
      return value === '' ? null : value;
    }),
  // Admin "Dismiss" on the Missing tab — clears the stale-event flag
  // so the row falls out of the ?missing=true filter. The crawler
  // re-stamps it if the event genuinely re-disappears on a future sweep.
  firstMissingAt: z.null().optional(),
  // PR 6 — admin "Mark non-concert" hides the event from every
  // consumer-facing listing query. See migration 0039 + the consumer
  // route audit.
  hiddenFromConsumer: z.boolean().optional(),
});

export type EventPatch = z.infer<typeof eventPatchSchema>;

/**
 * Partial event update with the watch-update fan-out (#1107, #1311). Returns
 * the updated row, or null when the event does not exist.
 */
export const updateEvent = async (id: string, body: EventPatch) => {
  // Only bother with the transactional pre-state lock when the PATCH
  // actually touches status or date — every other field is edit-only
  // and doesn't need a serialize gate.
  const touchesTransitionField =
    typeof body.status === 'string' || typeof body.date === 'string';

  // #1107: read pre-state + write inside a transaction so two concurrent
  // PATCHes can't both observe the same pre-state and fan out twice.
  // SELECT FOR UPDATE serializes on the row. Fan-out fires only for the
  // transaction that actually observed the transition; a losing PATCH
  // sees the new state and computes category=null.
  const result = await db.transaction(async (tx) => {
    let preUpdate:
      { status: string; date: string; delistedAt: Date | null } | undefined;
    if (touchesTransitionField) {
      const rows = await tx
        .select({
          status: events.status,
          date: events.date,
          delistedAt: events.delistedAt,
        })
        .from(events)
        .where(eq(events.id, id))
        .for('update')
        .limit(1);
      preUpdate = rows[0];
    }

    const [updated] = await tx
      .update(events)
      // Any status an admin sets is a decision, not the sweep's guess, so
      // it ends No longer listed (B+ A5).
      .set({
        ...body,
        // Clears first_missing_at too on a delisted row: otherwise the show
        // hides again right after its watchers hear, and a restore would be
        // re-cancelled by the next sweep.
        ...(typeof body.status === 'string' && endDelisting()),
        updatedAt: new Date(),
      })
      .where(eq(events.id, id))
      .returning();

    // Watch-update fan-out category — computed inside the tx against the
    // locked pre-state row. Fires AFTER commit.
    //
    // Categories fired:
    //   - watch.cancelled when status flips upcoming|postponed → cancelled
    //   - watch.postponed when status flips upcoming|cancelled → postponed
    //   - watch.postponed on a date change to an upcoming/postponed event
    //
    // A date change carries the same signal as a status flip to postponed
    // (the show is on a different night), so we treat both as
    // watch.postponed. If both a status flip AND a date change land in the
    // same PATCH, we still fan out only once — status transitions win.
    let category: 'watch.cancelled' | 'watch.postponed' | null = null;
    if (preUpdate && updated) {
      // Confirming a delisted show as cancelled is a real transition:
      // the sweep told nobody.
      const wasDelisted = preUpdate.delistedAt !== null;
      if (
        typeof body.status === 'string' &&
        (body.status !== preUpdate.status ||
          (body.status === 'cancelled' && wasDelisted))
      ) {
        if (body.status === 'cancelled') category = 'watch.cancelled';
        else if (body.status === 'postponed') category = 'watch.postponed';
      } else if (
        typeof body.date === 'string' &&
        body.date !== preUpdate.date &&
        // Skip if this event is already cancelled — a stale ticker
        // somewhere may still emit dates for cancelled events; watchers
        // already got the cancel notification.
        preUpdate.status !== 'cancelled'
      ) {
        category = 'watch.postponed';
      }
    }

    return { updated, category };
  });

  if (!result.updated) return null;

  if (result.category) {
    await fanoutWatchNotification(
      {
        db,
        notifications,
        userEvents,
        events,
        venues,
      },
      {
        eventId: id,
        category: result.category,
        // #1311: the committed updated_at of the PATCH that observed the
        // transition under FOR UPDATE. Set inside that transaction, so it
        // names this one write: a later genuine flip commits a new value.
        transition: `patch:${result.updated.updatedAt.toISOString()}`,
      },
    );
  }

  return result.updated;
};
