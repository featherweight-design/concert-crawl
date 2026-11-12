import { and, eq, ne, sql } from 'drizzle-orm';
import { db, events, priceSubmissions } from '@concert-crawl/db';
import { awardPriceCred } from '../../../lib/award-price-cred.js';
import { leadingCounterOrderBy } from '../../../lib/price-check.js';
import { writeContestNotifications } from '../../../lib/contest-notifications.js';
import {
  detectPriceDrop,
  fanoutPriceDrop,
  type PriceDrop,
} from '../../../lib/price-drop.js';

export type ContestResolution = 'parent_wins' | 'challenger_wins';

export type ResolveContestOutcome =
  | {
      ok: 'committed';
      parent: typeof priceSubmissions.$inferSelect;
      challenger: typeof priceSubmissions.$inferSelect;
      eventPriceUpdated: boolean;
      pricedrop: PriceDrop | undefined;
      orphanedCounterIds: string[];
      before: {
        parent: {
          status: string;
          priceMin: string;
          priceMax: string | null;
        };
        challenger: {
          status: string;
          priceMin: string;
          priceMax: string | null;
        };
      };
    }
  | { ok: 'not_found' }
  | { ok: 'precondition_failed'; reason: string };

/**
 * Resolve a price contest atomically (POST /v1/admin/contests/prices/:id/resolve):
 * the parent and counter flip together, the winner's cred and the event's
 * projected price follow, then the participants are notified and a strictly
 * lower price fans out to watchers. The caller writes the audit row.
 */
export const resolveContest = async (
  contestId: string,
  resolution: ContestResolution,
  reason: string,
  challengerId?: string,
): Promise<ResolveContestOutcome> => {
  const outcome: ResolveContestOutcome = await db.transaction(async (tx) => {
    // Lock the parent row first.
    const [parent] = await tx
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, contestId))
      .limit(1)
      .for('update');
    if (!parent) return { ok: 'not_found' };

    // Lock the challenger: the pending counter the admin named, or else
    // the leading one (most confirmations, then earliest filed; see
    // lib/price-check.ts). Several fans can each have one open on this
    // parent (B+ B9); the rest are archived as superseded below. If a
    // previous resolution already archived it, we surface
    // precondition_failed instead of silently no-oping.
    const [challenger] = await tx
      .select()
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.disputedSubmissionId, contestId),
          eq(priceSubmissions.status, 'pending'),
          challengerId !== undefined
            ? eq(priceSubmissions.id, challengerId)
            : undefined,
        ),
      )
      .orderBy(...leadingCounterOrderBy())
      .limit(1)
      .for('update');
    if (!challenger) {
      return {
        ok: 'precondition_failed',
        reason: 'No pending counter exists for this contest.',
      };
    }

    // Sanity gates.
    if (parent.disputedSubmissionId !== null) {
      return {
        ok: 'precondition_failed',
        reason: 'Target row is a counter, not a parent.',
      };
    }
    if (parent.status !== 'disputed' && parent.status !== 'corroborated') {
      return {
        ok: 'precondition_failed',
        reason: `Parent status is ${parent.status}; cannot resolve.`,
      };
    }
    if (challenger.status !== 'pending') {
      return {
        ok: 'precondition_failed',
        reason: `Challenger status is ${challenger.status}; cannot resolve.`,
      };
    }
    // Same-slot assertions — defense-in-depth against a counter being
    // inserted with a mismatched slot. Without these, a parameter mix-up
    // could propagate the wrong price into the events row.
    if (parent.eventId !== challenger.eventId) {
      return {
        ok: 'precondition_failed',
        reason: 'Parent and challenger belong to different events.',
      };
    }
    if (parent.tier !== challenger.tier) {
      return {
        ok: 'precondition_failed',
        reason: `Parent tier ${parent.tier} does not match challenger tier ${challenger.tier}.`,
      };
    }
    // Treat NULL source_category as "matches anything." Legacy rows
    // pre-PR-#651 have parent.sourceCategory = null; the counter-creation
    // routes explicitly derive a non-null value (see submissions.ts and
    // price-submissions.ts), so a strict `!==` check permanently locks
    // those contests at the same-slot assertion. The original safety
    // invariant — both sides non-null and unequal — is preserved.
    if (
      parent.sourceCategory !== null &&
      challenger.sourceCategory !== null &&
      parent.sourceCategory !== challenger.sourceCategory
    ) {
      return {
        ok: 'precondition_failed',
        reason: `Parent source_category ${parent.sourceCategory} does not match challenger source_category ${challenger.sourceCategory}.`,
      };
    }

    const before = {
      parent: {
        status: parent.status,
        priceMin: parent.priceMin,
        priceMax: parent.priceMax,
      },
      challenger: {
        status: challenger.status,
        priceMin: challenger.priceMin,
        priceMax: challenger.priceMax,
      },
    };

    // Unlocked existence check for the precondition. The event row is
    // NOT locked here: a lock taken before the submission updates below
    // can deadlock against a concurrent confirm/admin approval that holds
    // the corroborated-price unique-index entry for this event/tier and
    // is itself waiting on the event row. Every price writer takes
    // submission rows first and the event row second (#1107).
    const [eventExists] = await tx
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, parent.eventId))
      .limit(1);
    if (!eventExists) {
      // Should be unreachable given the FK from price_submissions.event_id,
      // but treat as precondition_failed rather than a 500 if it ever fires.
      return {
        ok: 'precondition_failed',
        reason: 'Event row missing for parent submission.',
      };
    }

    let eventPriceUpdated = false;
    let pricedrop: PriceDrop | undefined;

    if (resolution === 'challenger_wins') {
      // Winner = challenger → corroborated. Loser = parent → archived.
      // Clearing lastAdminActionKind/At on BOTH rows ensures any prior
      // "Admin requested more info" pill from a defer doesn't outlive the
      // resolution (spec §4.5).
      await tx
        .update(priceSubmissions)
        .set({
          status: 'corroborated',
          lastAdminActionKind: null,
          lastAdminActionAt: null,
          updatedAt: sql`now()`,
        })
        .where(eq(priceSubmissions.id, challenger.id));
      await tx
        .update(priceSubmissions)
        .set({
          status: 'archived',
          archivedReason: reason,
          lastAdminActionKind: null,
          lastAdminActionAt: null,
          updatedAt: sql`now()`,
        })
        .where(eq(priceSubmissions.id, parent.id));

      // Cred before the event lock: the global price-writer lock order is
      // submissions, then user_cred, then events (see lib/price-drop.ts).
      if (challenger.userId !== null) {
        await awardPriceCred(tx, challenger.userId);
      }

      // Only now, after the submission and cred rows, lock and read the event.
      // priceSource gates the projection: we never overwrite a
      // non-community headline (ticketmaster/axs/etc.) even when a
      // community contest resolves on the same slot. #1107: the PRE-update
      // ticketPriceMin decides watch.pricedrop. FOR NO KEY UPDATE
      // serializes this against the other price writers without blocking
      // foreign-key KEY SHARE checks on the event.
      const [eventRow] = await tx
        .select({
          priceSource: events.priceSource,
          ticketPriceMin: events.ticketPriceMin,
        })
        .from(events)
        .where(eq(events.id, parent.eventId))
        .for('no key update')
        .limit(1);
      const projectionAllowed =
        eventRow !== undefined &&
        (eventRow.priceSource === null || eventRow.priceSource === 'community');
      if (projectionAllowed) {
        await tx
          .update(events)
          .set({
            ticketPriceMin: challenger.priceMin,
            ticketPriceMax: challenger.priceMax ?? null,
            priceSource: 'community',
            updatedAt: sql`now()`,
          })
          .where(eq(events.id, parent.eventId));
        eventPriceUpdated = true;
        pricedrop = detectPriceDrop(
          parent.eventId,
          eventRow.ticketPriceMin,
          challenger.priceMin,
        );
      }
    } else {
      // parent_wins: parent stays canonical → corroborated.
      // counter loses → archived with admin's reason.
      await tx
        .update(priceSubmissions)
        .set({
          status: 'corroborated',
          lastAdminActionKind: null,
          lastAdminActionAt: null,
          updatedAt: sql`now()`,
        })
        .where(eq(priceSubmissions.id, parent.id));
      await tx
        .update(priceSubmissions)
        .set({
          status: 'archived',
          archivedReason: reason,
          lastAdminActionKind: null,
          lastAdminActionAt: null,
          updatedAt: sql`now()`,
        })
        .where(eq(priceSubmissions.id, challenger.id));
      // events row already reflects parent's price; no propagation.
      // Parent submitter already received cred when initially corroborated;
      // no re-award.
    }

    // Superseded cleanup — archive every OTHER pending counter against
    // this parent; one resolution decides the whole check (B+ B9). The ne()
    // guard avoids double-touching the winner/loser the handler just
    // flipped.
    const orphans = await tx
      .update(priceSubmissions)
      .set({
        status: 'archived',
        // Reason text must stay accurate regardless of resolution
        // direction — the parent is NOT always archived (parent_wins
        // leaves it corroborated). "Superseded by contest resolution"
        // works for both branches and points readers at the resolution
        // audit row by parent id (= contestId).
        archivedReason: `Superseded by contest resolution ${parent.id}`,
        lastAdminActionKind: null,
        lastAdminActionAt: null,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(priceSubmissions.disputedSubmissionId, parent.id),
          eq(priceSubmissions.status, 'pending'),
          ne(priceSubmissions.id, challenger.id),
        ),
      )
      .returning({ id: priceSubmissions.id });
    const orphanedCounterIds = orphans.map((row) => row.id);

    const [parentAfter] = await tx
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, parent.id))
      .limit(1);
    const [challengerAfter] = await tx
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, challenger.id))
      .limit(1);
    if (!parentAfter || !challengerAfter) {
      throw new Error(
        'Post-resolution read failed — parent or challenger missing.',
      );
    }

    return {
      ok: 'committed',
      parent: parentAfter,
      challenger: challengerAfter,
      eventPriceUpdated,
      pricedrop,
      orphanedCounterIds,
      before,
    };
  });

  if (outcome.ok !== 'committed') return outcome;

  // Notification fan-out lives in apps/api/src/lib/contest-notifications.ts
  // (extracted in Task 10). The helper handles dedupe, JSON-encoding the
  // metadata text column, and swallowing insert failures so a notification
  // error can't appear to roll back the already-committed resolution.
  await writeContestNotifications({
    contestId,
    parentSubmissionId: outcome.parent.id,
    challengerSubmissionId: outcome.challenger.id,
    parentUserId: outcome.parent.userId,
    challengerUserId: outcome.challenger.userId,
    eventId: outcome.parent.eventId,
    action: 'resolve',
    resolution,
    reason,
  });

  // #1107: a challenger_wins resolution that projected a strictly lower
  // price onto the event fans out watch.pricedrop to watchers, after the
  // commit. parent_wins never sets this (the event already shows the
  // parent's price). Best-effort; never fails the resolution.
  if (outcome.pricedrop) {
    // #1311: the winning challenger, corroborated by this resolution, plus
    // its committed updated_at (re-read after the update, inside the tx).
    await fanoutPriceDrop(
      outcome.pricedrop,
      `submission:${outcome.challenger.id}:${outcome.challenger.updatedAt.toISOString()}`,
    );
  }

  return outcome;
};
