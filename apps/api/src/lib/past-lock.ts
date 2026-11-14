// The past lock (admin 4a-3b): a show dated before today in Denver is
// history, so its sale state and most of its fields stay as they were. One
// definition of "past", one error and one 409 body for every path that
// enforces it: the admin PATCH, the admin sold-out and available endpoints,
// the admin report resolve and the fan confirm threshold.

import { eq } from 'drizzle-orm';
import { events } from '@concert-crawl/db';
import type { DbTransaction } from './db-executor.js';
import { todayInDenver } from './time.js';

/** A write the past lock refuses. Thrown inside a transaction, it rolls back. */
export class PastLockedError extends Error {
  constructor() {
    super('past_locked');
    this.name = 'PastLockedError';
  }
}

/** The event a sale-state write names does not exist. */
export class EventNotFoundError extends Error {
  constructor() {
    super('event_not_found');
    this.name = 'EventNotFoundError';
  }
}

/** The 409 body every admin write returns when the past lock refuses it. */
export const PAST_LOCKED_BODY = {
  success: false,
  error: 'past_locked',
} as const;

/**
 * "Past": a show dated before `today`, the Denver date from `todayInDenver()`.
 * A show dated today is not past.
 */
export const isPastShow = (date: string, today: string): boolean =>
  date < today;

/**
 * Lock the event row FOR UPDATE and refuse a past show, before any sale-state
 * write (marking or promoting sold out, clearing it). Today is read after the
 * lock is taken, so a request that waited on the lock across midnight judges
 * by the day it writes on. Throws EventNotFoundError for a missing event and
 * PastLockedError for a past one; the caller's transaction then rolls back.
 *
 * A postponed show whose date has passed is refused too: it "stays Postponed
 * until you set the new date or mark it cancelled" (addendum 6), so it has no
 * live sale to change until the PATCH reschedules it.
 */
export const lockEventForSaleWrite = async (
  tx: DbTransaction,
  eventId: string,
): Promise<void> => {
  const [row] = await tx
    .select({ date: events.date })
    .from(events)
    .where(eq(events.id, eventId))
    .for('update')
    .limit(1);
  if (!row) throw new EventNotFoundError();
  if (isPastShow(row.date, todayInDenver())) throw new PastLockedError();
};
