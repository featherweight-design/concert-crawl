import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { endDelisting } from '@concert-crawl/db/upcoming-events';
import {
  db,
  eventReports,
  events,
  notifications,
  userEvents,
  venues,
} from '@concert-crawl/db';
import { fanoutWatchNotification } from '@concert-crawl/push';
import { activePromotedReportWhere } from '../../../lib/sold-out.js';

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

export type EventPatch = z.input<typeof eventPatchSchema>;

/**
 * Thrown inside the update transaction when a past show's PATCH changes a
 * locked field (admin 4a-3b: "past rows accept only `hiddenFromConsumer`, and
 * anything else returns 409 `past_locked`"). A postponed past show may also
 * move its date, times and status, or it could never be rescheduled. The
 * throw rolls the transaction back, so nothing is written.
 */
export class PastLockedError extends Error {
  constructor() {
    super('past_locked');
    this.name = 'PastLockedError';
  }
}

type EventRow = typeof events.$inferSelect;
type PatchKey = keyof EventPatch & keyof EventRow;

const isPatchKey = (key: string): key is PatchKey =>
  key in eventPatchSchema.shape;

/** Every past show may change this. */
const PAST_ALLOWED: ReadonlySet<PatchKey> = new Set(['hiddenFromConsumer']);

/** A postponed past show may also be rescheduled. */
const POSTPONED_PAST_ALLOWED: ReadonlySet<PatchKey> = new Set([
  'hiddenFromConsumer',
  'date',
  'doorsTime',
  'showTime',
  'status',
]);

/** True when the patch sets any field a past show may lock. */
const setsPastLockedField = (body: EventPatch): boolean =>
  Object.entries(body).some(
    ([key, value]) =>
      value !== undefined && !(isPatchKey(key) && PAST_ALLOWED.has(key)),
  );

// Postgres hands back `time` as HH:MM:SS and `numeric` as a scale-2 string,
// while a PATCH may send HH:MM or 25, so both compare by value.
const sameStoredValue = (
  key: PatchKey,
  next: unknown,
  stored: unknown,
): boolean => {
  if (next === null || stored === null) return next === stored;
  if (key === 'doorsTime' || key === 'showTime') {
    return String(next).padEnd(8, ':00') === String(stored).padEnd(8, ':00');
  }
  if (key === 'ticketPriceMin' || key === 'ticketPriceMax') {
    return Number(next) === Number(stored);
  }
  if (Array.isArray(next) && Array.isArray(stored)) {
    return (
      next.length === stored.length &&
      next.every((item, index) => item === stored[index])
    );
  }
  return next === stored;
};

/** The patch's keys whose value differs from the stored row. */
const changedKeys = (body: EventPatch, stored: EventRow): PatchKey[] =>
  Object.entries(body).flatMap(([key, value]) =>
    isPatchKey(key) &&
    value !== undefined &&
    !sameStoredValue(key, value, stored[key])
      ? [key]
      : [],
  );

export interface UpdateEventOptions {
  /**
   * Today's date in Denver (`YYYY-MM-DD`). When given, a show dated before it
   * (the list's Past side) refuses any change but `hiddenFromConsumer` with
   * PastLockedError; a postponed one may also change its date, times and
   * status. Read from the locked row, never from the request.
   */
  lockPastBefore?: string;
}

/**
 * Partial event update with the watch-update fan-out (#1107, #1311). Returns
 * the updated row, or null when the event does not exist.
 */
export const updateEventNotifying = async (
  id: string,
  body: EventPatch,
  options: UpdateEventOptions = {},
) => {
  // Set only when the patch reaches past `hiddenFromConsumer`, so the past
  // lock has something to check.
  const pastLockBefore = setsPastLockedField(body)
    ? options.lockPastBefore
    : undefined;
  // Read the locked pre-state row only when something needs it: a status or
  // date change (the transition fan-out) or the past lock. Every other edit
  // skips the serialize gate.
  const readsPreState =
    typeof body.status === 'string' ||
    typeof body.date === 'string' ||
    pastLockBefore !== undefined;

  // #1107: read pre-state + write inside a transaction so two concurrent
  // PATCHes can't both observe the same pre-state and fan out twice.
  // SELECT FOR UPDATE serializes on the row. Fan-out fires only for the
  // transaction that actually observed the transition; a losing PATCH
  // sees the new state and computes category=null.
  const result = await db.transaction(async (tx) => {
    let preUpdate: EventRow | undefined;
    if (readsPreState) {
      const rows = await tx
        .select()
        .from(events)
        .where(eq(events.id, id))
        .for('update')
        .limit(1);
      preUpdate = rows[0];
      // The stored row decides, so a PATCH that also moves the date cannot
      // unlock a past show. A field re-sent at its stored value is not a
      // write; a postponed show may still be rescheduled.
      if (
        pastLockBefore !== undefined &&
        preUpdate &&
        preUpdate.date < pastLockBefore
      ) {
        const allowed =
          preUpdate.status === 'postponed'
            ? POSTPONED_PAST_ALLOWED
            : PAST_ALLOWED;
        if (changedKeys(body, preUpdate).some((key) => !allowed.has(key))) {
          throw new PastLockedError();
        }
      }
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

    // Moving a show off cancelled or postponed retires the fan report that
    // was promoted into that status, as clearSoldOut does for sold out.
    // Left promoted, it would be credited again on the event page if an
    // admin later set the same status for a different reason.
    if (
      preUpdate &&
      typeof body.status === 'string' &&
      body.status !== preUpdate.status &&
      (preUpdate.status === 'cancelled' || preUpdate.status === 'postponed')
    ) {
      await tx
        .update(eventReports)
        .set({
          resolution: 'rejected',
          adminNote: `admin moved the show off ${preUpdate.status}`,
        })
        .where(activePromotedReportWhere(id, preUpdate.status));
    }

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

  let watchersNotified = 0;
  if (result.category) {
    const sent = await fanoutWatchNotification(
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
    watchersNotified = sent.watchersNotified;
  }

  // `watchersNotified` is the in-app notices actually written: 0 when nothing
  // fired (no real transition) or the fan-out found no one to tell.
  return { updated: result.updated, watchersNotified };
};

/** The event update without the fan-out count, for the callers that ignore it. */
export const updateEvent = async (
  id: string,
  body: EventPatch,
  options: UpdateEventOptions = {},
) => (await updateEventNotifying(id, body, options))?.updated ?? null;
