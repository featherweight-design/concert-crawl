// apps/api/src/lib/price-check.ts
//
// The rules for a price under an open price check, in one place. The pure
// halves (no DB) live in price-check-rules.ts and are re-exported here.
//
// A price check opens when a fan files an update (a "counter") against a
// corroborated price: the counter lands `pending` and the parent flips to
// `disputed` in the same transaction. Several fans may each file one update
// against the same price (B+ B9, 2026-11-11), so a check can hold more than
// one pending counter.
//
// 1. The current price stays the price while the check is open. Every surface
//    that shows a price (Browse, the artist page, digests, the event page)
//    reads a disputed parent with a pending same-tier counter as if it were
//    still live, unless a live price in the same tier outranks it.
// 2. The LEADING counter is the one the check is decided on by default:
//    the most confirmations first, then the earliest filed, then id. It
//    follows the auto-promote rule: the first counter to reach the confirm
//    threshold wins, and with no confirms the first to be filed is ahead.
//    The event page shows it, the admin queue lists it, and admin resolve
//    and defer act on it unless told otherwise.
// 3. Once a check is decided, every other pending counter against the same
//    parent is archived as superseded. That happens on admin resolve and when
//    a counter auto-promotes on confirms (settleCheckOnCounterPromotion).

import {
  and,
  asc,
  desc,
  eq,
  exists,
  ne,
  notExists,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db, priceSubmissions } from '@concert-crawl/db';

import type { DbExecutor } from './db-executor.js';

export {
  compareLeadingCounters,
  dropCheckedWhereLive,
  priceCheckFields,
} from './price-check-rules.js';

/**
 * WHERE condition for the rows that set a displayed price: live
 * (`corroborated`) rows, plus a `disputed` parent that has a pending
 * same-tier counter, i.e. the current price under an open check. A
 * `disputed` row with no pending counter is an admin denial and stays out.
 */
export function currentPriceCondition(): SQL {
  const openCounter = alias(priceSubmissions, 'open_check_counter');
  const condition = or(
    eq(priceSubmissions.status, 'corroborated'),
    and(
      eq(priceSubmissions.status, 'disputed'),
      exists(
        db
          .select({ one: sql`1` })
          .from(openCounter)
          .where(
            and(
              eq(openCounter.disputedSubmissionId, priceSubmissions.id),
              eq(openCounter.status, 'pending'),
              eq(openCounter.tier, priceSubmissions.tier),
            ),
          ),
      ),
    ),
  );
  if (condition === undefined) {
    throw new Error('currentPriceCondition built an empty condition');
  }
  return condition;
}

/** Selected beside `currentPriceCondition`: true for a price under a check. */
export function underCheckSql(): SQL<boolean> {
  return sql<boolean>`${priceSubmissions.status} = 'disputed'`;
}

/** The same order as `compareLeadingCounters`, for an ORDER BY. */
export const leadingCounterOrderBy = [
  desc(priceSubmissions.corroborationCount),
  asc(priceSubmissions.createdAt),
  asc(priceSubmissions.id),
];

/**
 * A counter just auto-promoted to `corroborated` on confirms: it won the
 * check. Archive the parent it replaced and every other pending counter
 * against that parent, inside the caller's transaction so the check can never
 * be left half-decided. Lock order: submission rows only, so callers must run
 * this before they lock the event row. No-op for a non-counter.
 */
export async function settleCheckOnCounterPromotion(
  executor: DbExecutor,
  counter: { id: string; disputedSubmissionId: string | null },
): Promise<void> {
  const parentId = counter.disputedSubmissionId;
  if (parentId === null) return;

  await executor
    .update(priceSubmissions)
    .set({
      status: 'archived',
      archivedReason: `Replaced by price check update ${counter.id}`,
      lastAdminActionKind: null,
      lastAdminActionAt: null,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(priceSubmissions.id, parentId),
        eq(priceSubmissions.status, 'disputed'),
      ),
    );

  await executor
    .update(priceSubmissions)
    .set({
      status: 'archived',
      archivedReason: `Superseded by price check update ${counter.id}`,
      lastAdminActionKind: null,
      lastAdminActionAt: null,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(priceSubmissions.disputedSubmissionId, parentId),
        eq(priceSubmissions.status, 'pending'),
        ne(priceSubmissions.id, counter.id),
      ),
    );
}

/**
 * The last pending update on a price was withdrawn: the check is over with
 * nothing to decide, so the parent goes back to `corroborated`. Without this
 * a withdrawn update left the parent `disputed` with no counter, which every
 * price surface reads as an admin denial, so the price vanished. A parent
 * that still has another pending counter stays under check.
 */
export async function reopenPriceWhenCheckEmpty(
  executor: DbExecutor,
  parentId: string,
): Promise<void> {
  const otherCounter = alias(priceSubmissions, 'remaining_counter');
  await executor
    .update(priceSubmissions)
    .set({ status: 'corroborated', updatedAt: sql`now()` })
    .where(
      and(
        eq(priceSubmissions.id, parentId),
        eq(priceSubmissions.status, 'disputed'),
        notExists(
          db
            .select({ one: sql`1` })
            .from(otherCounter)
            .where(
              and(
                eq(otherCounter.disputedSubmissionId, parentId),
                eq(otherCounter.status, 'pending'),
              ),
            ),
        ),
      ),
    );
}

/** The 409 both counter-creation routes return for a fan's second update. */
export const OWN_UPDATE_PENDING_ERROR =
  'You already have an update pending on this price.';

/** Whether any pending counter is open against this parent. */
export async function hasPendingCounter(parentId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: priceSubmissions.id })
    .from(priceSubmissions)
    .where(
      and(
        eq(priceSubmissions.disputedSubmissionId, parentId),
        eq(priceSubmissions.status, 'pending'),
      ),
    )
    .limit(1);
  return row !== undefined;
}
