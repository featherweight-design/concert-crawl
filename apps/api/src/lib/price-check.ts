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
// Rollout: migration 0099 adds the one-update-per-fan index; 0041's
// one-update-per-price index stays until a separate later PR ships migration
// 0100 (number reserved; needs Hugh's OK for prod) to drop it. Until then a
// second fan's update hits 0041's index and gets a clean 409
// (OTHER_UPDATE_PENDING_ERROR, code price_check_update_pending), and this
// code otherwise runs the same with one counter per price or several.
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
// 4. Lock order: every path that changes a check locks the PARENT row first
//    (lockParent, SELECT ... FOR UPDATE), then counter rows, then user_cred,
//    then the event row. Filing, withdrawing, confirming or promoting a
//    counter and admin resolve/defer all take the parent first, so they
//    serialize on it instead of deadlocking, and each re-checks status under
//    that lock with a conditional UPDATE.

import {
  and,
  asc,
  desc,
  eq,
  exists,
  inArray,
  ne,
  or,
  sql,
  type AnyColumn,
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

/**
 * `created_at` at the millisecond precision a JS Date carries. Postgres keeps
 * microseconds, so ranking on the raw column could pick a different leader
 * than `compareLeadingCounters` does in memory for two updates filed within
 * the same millisecond; truncating makes both fall through to the id.
 */
export function filedAtMs(column: AnyColumn): SQL<Date> {
  return sql<Date>`date_trunc('milliseconds', ${column})`;
}

/**
 * The same order as `compareLeadingCounters`, for an ORDER BY. A function,
 * not a module-level constant, so importing this module reads nothing off
 * the schema (test suites mock @concert-crawl/db with partial tables).
 */
export function leadingCounterOrderBy(): SQL[] {
  return [
    desc(priceSubmissions.corroborationCount),
    asc(filedAtMs(priceSubmissions.createdAt)),
    asc(priceSubmissions.id),
  ];
}

/**
 * Lock a price row FOR UPDATE: the first lock every check-changing path
 * takes (rule 4). Returns undefined when the row is gone.
 */
export async function lockParent(
  executor: DbExecutor,
  parentId: string,
): Promise<{ id: string; status: string } | undefined> {
  const [parent] = await executor
    .select({ id: priceSubmissions.id, status: priceSubmissions.status })
    .from(priceSubmissions)
    .where(eq(priceSubmissions.id, parentId))
    .for('update');
  return parent;
}

/** Whether any pending counter is open against this parent. */
export async function hasPendingCounter(
  parentId: string,
  executor: DbExecutor = db,
): Promise<boolean> {
  const [row] = await executor
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

/**
 * A price takes a new update while it is live (`corroborated`), or while it
 * is already under a check another fan opened (`disputed` with a pending
 * counter). A `disputed` row with nothing pending is an admin denial, and
 * an `archived` or `stale` row is a decided or retired price: neither takes
 * updates.
 */
export async function takesUpdates(
  parent: { id: string; status: string },
  executor: DbExecutor = db,
): Promise<boolean> {
  if (parent.status === 'corroborated') return true;
  return (
    parent.status === 'disputed' &&
    (await hasPendingCounter(parent.id, executor))
  );
}

export type FileCounterOutcome<Row> =
  { kind: 'created'; row: Row } | { kind: 'closed' };

/**
 * File a counter against a parent inside the caller's transaction: lock the
 * parent, re-check under the lock that it still takes updates, insert, then
 * flip the parent to `disputed` with a conditional UPDATE. Without the lock
 * a counter racing an admin resolve or an auto-promotion re-flipped an
 * archived parent to `disputed`, reopening a decided check and serving a dead
 * price. 'closed' means nothing was written.
 */
export async function fileCounterUnderLock<Row>(
  executor: DbExecutor,
  parentId: string,
  insert: () => Promise<Row>,
): Promise<FileCounterOutcome<Row>> {
  const parent = await lockParent(executor, parentId);
  if (parent === undefined || !(await takesUpdates(parent, executor))) {
    return { kind: 'closed' };
  }
  const row = await insert();
  const flipped = await executor
    .update(priceSubmissions)
    .set({ status: 'disputed', updatedAt: sql`now()` })
    .where(
      and(
        eq(priceSubmissions.id, parentId),
        inArray(priceSubmissions.status, ['corroborated', 'disputed']),
      ),
    )
    .returning({ id: priceSubmissions.id });
  if (flipped.length === 0) {
    // Unreachable under the lock; throwing rolls the insert back.
    throw new Error(`Parent ${parentId} left the price check under its lock`);
  }
  return { kind: 'created', row };
}

/**
 * A counter just auto-promoted to `corroborated` on confirms: it won the
 * check. Archive the parent it replaced and every other pending counter
 * against that parent, inside the caller's transaction so the check can never
 * be left half-decided. The caller must already hold the parent lock
 * (lockParent) and must run this before it locks the event row. No-op for a
 * non-counter.
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
 *
 * Why 'corroborated' is the right status to restore: a parent only becomes
 * 'disputed' with a counter through fileCounterUnderLock, which admits it
 * only when it is 'corroborated' or already under a check that itself began
 * from 'corroborated'. A pending, stale or archived price never takes a
 * counter, and an admin-denied 'disputed' row (no counter) never takes one
 * either, so a 'disputed' parent losing its last counter was live before.
 *
 * The caller must hold the parent lock (lockParent) from before it deleted
 * the counter. Filing a counter takes the same lock, so the pending check
 * below can't miss a counter committed in between; and two withdrawals of
 * the last two updates serialize on it, so the second sees the first gone
 * and reopens the price (without the lock each saw the other still pending
 * and the price vanished).
 */
export async function reopenPriceWhenCheckEmpty(
  executor: DbExecutor,
  parentId: string,
): Promise<void> {
  if (await hasPendingCounter(parentId, executor)) return;
  await executor
    .update(priceSubmissions)
    .set({ status: 'corroborated', updatedAt: sql`now()` })
    .where(
      and(
        eq(priceSubmissions.id, parentId),
        eq(priceSubmissions.status, 'disputed'),
      ),
    );
}

/** The `code` on every pending-update 409 from the counter routes. */
export const UPDATE_PENDING_CODE = 'price_check_update_pending';

/** The 409 both counter-creation routes return for a fan's second update. */
export const OWN_UPDATE_PENDING_ERROR =
  'You already have an update pending on this price.';

/**
 * The 409 for a second fan's update while migration 0041's one-per-parent
 * index still exists (until the 0100 contract migration drops it).
 */
export const OTHER_UPDATE_PENDING_ERROR =
  'Another update is already pending on this price.';
