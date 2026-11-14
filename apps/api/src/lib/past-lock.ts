// The past lock on reported state (admin 4a-3b, addendum 6 item 36): a show
// dated before today in Denver is history, so whether it is sold out,
// cancelled or postponed stays as it was. This gate covers every report-driven
// write, marking or promoting sold out, clearing it (Tickets available), and
// promoting a cancelled or postponed report (promoteReport), on every path:
// the admin sold-out and available endpoints, the admin report resolve (409
// `past_locked`) and the fan confirm threshold (the report closes as moot).
// One exception: a postponed show whose date passed "stays Postponed until
// you set the new date or mark it cancelled" (addendum 6), so a cancelled
// report still promotes on it (promoteReport).
// The admin PATCH has its own field-level lock
// (routes/admin/lib/event-update.ts) and shares this file's definitions.

import { eq } from 'drizzle-orm';
import { events } from '@concert-crawl/db';
import type { DbTransaction } from './db-executor.js';
import { apiLogger } from './logger.js';
import { NOT_ON_SALE_STATUSES } from './sold-out.js';
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
 * Lock the event row FOR UPDATE and say whether the show is past, before a
 * sale-state write. Today is read after the lock is taken, so a request that
 * waited on the lock across midnight, or behind a PATCH that moved the date,
 * judges by the row and the day it writes on. Throws EventNotFoundError for a
 * missing event.
 *
 * A postponed show whose date has passed is past too: it "stays Postponed
 * until you set the new date or mark it cancelled" (addendum 6), so it has no
 * live sale to change until the PATCH reschedules it.
 */
export const lockEventSaleState = async (
  tx: DbTransaction,
  eventId: string,
): Promise<'open' | 'past'> => (await lockEventRow(tx, eventId)).state;

/**
 * lockEventSaleState, also returning the show's status and delisting as read
 * under the same lock, for a write that decides on them (promoteReport).
 */
export const lockEventRow = async (
  tx: DbTransaction,
  eventId: string,
): Promise<{
  state: 'open' | 'past';
  status: string;
  delistedAt: Date | null;
}> => {
  const [row] = await tx
    .select({
      date: events.date,
      status: events.status,
      delistedAt: events.delistedAt,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .for('update')
    .limit(1);
  if (!row) throw new EventNotFoundError();
  return {
    state: isPastShow(row.date, todayInDenver()) ? 'past' : 'open',
    status: row.status,
    delistedAt: row.delistedAt,
  };
};

/** Why a show has no sale an admin can mark sold out. */
export type NotOnSaleReason = 'cancelled' | 'postponed' | 'delisted';

/** A sold-out mark on a show that is cancelled, postponed or delisted. */
export class NotOnSaleError extends Error {
  constructor(readonly reason: NotOnSaleReason) {
    super('not_on_sale');
    this.name = 'NotOnSaleError';
  }
}

/** The 409 body for a sold-out mark refused by NotOnSaleError. */
export const notOnSaleBody = (reason: NotOnSaleReason) =>
  ({ success: false, error: 'not_on_sale', reason }) as const;

/**
 * Lock the event row for marking it sold out: throws PastLockedError for a
 * past show, and NotOnSaleError for a cancelled, postponed or delisted one
 * (a show the stale sweep delisted reads `cancelled` too, so it says
 * 'delisted'). Either way the caller's transaction rolls back.
 */
export const lockEventForSaleWrite = async (
  tx: DbTransaction,
  eventId: string,
): Promise<void> => {
  const show = await lockEventRow(tx, eventId);
  if (show.state === 'past') throw new PastLockedError();
  if (show.delistedAt !== null) throw new NotOnSaleError('delisted');
  const notOnSale = NOT_ON_SALE_STATUSES.find(
    (status) => status === show.status,
  );
  if (notOnSale) throw new NotOnSaleError(notOnSale);
};

/**
 * Log an error caught from a sale-state write and classify it: 'past' and
 * 'missing' are the gate's refusals (logged at warn), null is anything else
 * (logged at error), which the caller rethrows.
 */
export const classifySaleRefusal = (
  err: unknown,
  context: { msg: string; eventId: string; reportId?: string },
): 'past' | 'missing' | null => {
  const { msg, ...ids } = context;
  if (err instanceof PastLockedError) {
    apiLogger.warn(ids, `${msg}: refused, past show`);
    return 'past';
  }
  if (err instanceof EventNotFoundError) {
    apiLogger.warn(ids, `${msg}: event not found`);
    return 'missing';
  }
  apiLogger.error({ err, ...ids }, `${msg}: failed`);
  return null;
};
