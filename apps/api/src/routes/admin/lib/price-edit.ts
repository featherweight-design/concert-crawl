import { and, eq, sql } from 'drizzle-orm';
import { db, events, priceSubmissions } from '@concert-crawl/db';

export type EditPriceResult =
  | {
      ok: true;
      updated: typeof priceSubmissions.$inferSelect;
      before: { priceMin: string; priceMax: string | null };
      /** The show's own price followed this one (it was this price's projection). */
      eventUpdated: boolean;
    }
  | { ok: false }
  | { ok: 'contest_lockout' }
  | { ok: 'not_editable' };

/** Two stored amounts are the same figure ("40" and "40.00"), or both absent. */
const sameAmount = (left: string | null, right: string | null): boolean =>
  left === null || right === null
    ? left === right
    : Number(left) === Number(right);

/**
 * Correct the price on one submission (PATCH /v1/admin/prices/submissions/:id/price,
 * the Submitted prices row menu's "Edit price"). Only a waiting or published
 * price can be edited; an archived, stale or disputed one is history. A Price
 * check's rows are locked out exactly as in `setSubmissionStatus` and
 * `rejectSubmission`.
 *
 * A published price is what the show displays (`events.ticket_price_min` was
 * projected from it). When the show still carries exactly this price's figure
 * from the community, the edit moves the show's price with it; when the show's
 * price has since come from elsewhere (another submission, the crawl), the show
 * is left alone.
 */
export const editSubmissionPrice = async (
  id: string,
  priceMin: string,
  priceMax: string | null,
): Promise<EditPriceResult> =>
  db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        eventId: priceSubmissions.eventId,
        status: priceSubmissions.status,
        priceMin: priceSubmissions.priceMin,
        priceMax: priceSubmissions.priceMax,
        disputedSubmissionId: priceSubmissions.disputedSubmissionId,
      })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, id))
      .limit(1)
      .for('update');
    if (!existing) return { ok: false as const };

    if (existing.disputedSubmissionId !== null) {
      return { ok: 'contest_lockout' as const };
    }
    const pendingCounter = await tx
      .select({ id: priceSubmissions.id })
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.disputedSubmissionId, id),
          eq(priceSubmissions.status, 'pending'),
        ),
      )
      .limit(1);
    if (pendingCounter.length > 0) return { ok: 'contest_lockout' as const };

    if (existing.status !== 'pending' && existing.status !== 'corroborated') {
      return { ok: 'not_editable' as const };
    }

    const [updated] = await tx
      .update(priceSubmissions)
      .set({ priceMin, priceMax, updatedAt: sql`now()` })
      .where(eq(priceSubmissions.id, id))
      .returning();
    if (!updated) return { ok: false as const };

    let eventUpdated = false;
    if (existing.status === 'corroborated') {
      // Lock order, as in every price writer: submission row first, event second.
      const [event] = await tx
        .select({
          ticketPriceMin: events.ticketPriceMin,
          ticketPriceMax: events.ticketPriceMax,
          priceSource: events.priceSource,
        })
        .from(events)
        .where(eq(events.id, existing.eventId))
        .for('no key update')
        .limit(1);
      const followed =
        event !== undefined &&
        event.priceSource === 'community' &&
        sameAmount(event.ticketPriceMin, existing.priceMin) &&
        sameAmount(event.ticketPriceMax, existing.priceMax);
      if (followed) {
        await tx
          .update(events)
          .set({ ticketPriceMin: priceMin, ticketPriceMax: priceMax })
          .where(eq(events.id, existing.eventId));
        eventUpdated = true;
      }
    }

    return {
      ok: true as const,
      updated,
      before: { priceMin: existing.priceMin, priceMax: existing.priceMax },
      eventUpdated,
    };
  });
