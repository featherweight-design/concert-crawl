import { and, eq, sql } from 'drizzle-orm';
import { db, events, priceSubmissions } from '@concert-crawl/db';
import { awardPriceCred } from '../../../lib/award-price-cred.js';
import {
  detectPriceDrop,
  fanoutPriceDrop,
  type PriceDrop,
} from '../../../lib/price-drop.js';

export type SubmissionStatus = 'corroborated' | 'disputed' | 'stale';

export type SetSubmissionStatusResult =
  | {
      ok: true;
      updated: typeof priceSubmissions.$inferSelect;
      // #1107: on a promote-to-corroborated where the new price is
      // strictly below the previous event.ticketPriceMin, carry the
      // pre/post prices out of the transaction so the fan-out runs
      // AFTER commit — the fan-out writes its own bell rows outside
      // the tx boundary and shouldn't block the corroboration.
      pricedrop?: {
        eventId: string;
        oldPriceMin: string;
        newPriceMin: string;
      };
    }
  | { ok: false }
  | { ok: 'contest_lockout' };

/**
 * Approve (corroborated), dispute or stale one price submission
 * (PATCH /v1/admin/prices/submissions/:id): cred award, event price
 * projection and the watch.pricedrop fan-out after commit. Contest rows are
 * locked out and reported as `contest_lockout`; the caller logs that.
 */
export const setSubmissionStatus = async (
  id: string,
  status: SubmissionStatus,
): Promise<SetSubmissionStatusResult> => {
  const result: SetSubmissionStatusResult = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        userId: priceSubmissions.userId,
        status: priceSubmissions.status,
        eventId: priceSubmissions.eventId,
        priceMin: priceSubmissions.priceMin,
        priceMax: priceSubmissions.priceMax,
        disputedSubmissionId: priceSubmissions.disputedSubmissionId,
      })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, id))
      .limit(1)
      .for('update');

    if (!existing) return { ok: false };

    // Defensive lockout: contests must resolve through the dedicated
    // /v1/admin/contests/prices/:contestId endpoint so the parent + counter
    // are adjudicated atomically with audit + cred + event projection. This
    // pre-contest-UI endpoint can silently overturn a corroborated price if
    // an admin approves a counter row from the flat queue — block it at the
    // gate, before any update is applied. Spec §4.7 + §11.3.
    //
    // The condition is intentionally narrow: it fires only when a contest
    // ACTUALLY exists (counter row OR pending counter against this row).
    // We do NOT block PATCH on `status === 'disputed'` alone — a row may
    // be 'disputed' without a contest (e.g. admin moderation denial via
    // PATCH where disputed_submission_id IS NULL), and locking those out
    // would surface a misleading "part of a contest" 409. The pending-
    // counter check below catches the actual active-contest parent case.
    if (existing.disputedSubmissionId !== null) {
      return { ok: 'contest_lockout' as const };
    }

    // R2-2 — active-contest parent lockout. Both counter-creation routes
    // flip the parent to status='disputed' in the same transaction that
    // inserts the counter (Tasks 5 + 5b), but the parent could still be
    // in status='corroborated' with a pending counter against it under
    // three scenarios:
    //   (a) migration-window orphan rows that pre-date the flip logic,
    //   (b) the narrow window inside the resolve transaction between
    //       counter INSERT and parent UPDATE,
    //   (c) any future codepath that creates a counter without flipping
    //       the parent (would be a bug, but the lockout costs us nothing).
    // In any of these cases, mutating the parent here would race the
    // resolve flow's `parent.status IN ('corroborated', 'disputed')`
    // sanity gate. This is also the canonical "parent in an active
    // contest" lockout — counter rows hit the disputedSubmissionId check
    // above; parents land here.
    // EXISTS-style probe: we only need to know whether ANY pending counter
    // exists, not how many. SELECT ... LIMIT 1 gives the planner the same
    // early-exit semantics as EXISTS without requiring a count aggregate.
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
    if (pendingCounter.length > 0) {
      return { ok: 'contest_lockout' as const };
    }

    const [updated] = await tx
      .update(priceSubmissions)
      .set({ status, updatedAt: sql`now()` })
      .where(eq(priceSubmissions.id, id))
      .returning();

    if (!updated) return { ok: false };

    let pricedropForFanout: PriceDrop | undefined;
    if (status === 'corroborated' && existing.status !== 'corroborated') {
      // Award cred to the submitter
      if (existing.userId !== null) {
        await awardPriceCred(tx, existing.userId);
      }

      // #1107: read the event's PRE-update price so we can decide whether
      // to fan out watch.pricedrop. FOR NO KEY UPDATE locks the event row
      // so two admins corroborating different submissions for the same
      // event can't both observe the same pre-state and both fan out — the
      // second tx waits, reads the new floor, and skips fan-out. NO KEY
      // UPDATE leaves foreign-key KEY SHARE checks (e.g. a concurrent
      // dispute insert) unblocked. Lock order: submission row first (FOR
      // UPDATE above), event row second, as in every price writer.
      const [preEvent] = await tx
        .select({ ticketPriceMin: events.ticketPriceMin })
        .from(events)
        .where(eq(events.id, existing.eventId))
        .for('no key update')
        .limit(1);

      // Propagate the approved community price to the event
      await tx
        .update(events)
        .set({
          ticketPriceMin: existing.priceMin,
          ticketPriceMax: existing.priceMax ?? null,
          priceSource: 'community',
        })
        .where(eq(events.id, existing.eventId));

      // Real price-drop = strictly lower minimum (see lib/price-drop.ts).
      pricedropForFanout = detectPriceDrop(
        existing.eventId,
        preEvent?.ticketPriceMin,
        existing.priceMin,
      );
    }

    return pricedropForFanout
      ? { ok: true as const, updated, pricedrop: pricedropForFanout }
      : { ok: true as const, updated };
  });

  if (result.ok === true && result.pricedrop) {
    // #1311: the corroborated submission plus its committed updated_at
    // (set to now() in the corroborating transaction). One corroboration
    // is one transition; a submission un-corroborated and corroborated
    // again later commits a new timestamp.
    await fanoutPriceDrop(
      result.pricedrop,
      `submission:${result.updated.id}:${result.updated.updatedAt.toISOString()}`,
    );
  }
  return result;
};
