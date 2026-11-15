import { and, count, eq, isNull, or, sql } from 'drizzle-orm';
import { db, events, priceSubmissions, userEvents } from '@concert-crawl/db';
import { currentPriceCondition } from '../../../lib/price-check.js';

/**
 * A Submitted price that stands on a show: awaiting review, or setting the
 * displayed price (`currentPriceCondition`, which keeps a price under an
 * open Price check). Never a counter filed against another price.
 */
export const submittedPriceWhere = () =>
  and(
    isNull(priceSubmissions.disputedSubmissionId),
    or(eq(priceSubmissions.status, 'pending'), currentPriceCondition()),
  );

/**
 * People with a given `user_events` status on the row in scope (a correlated
 * count, built per request so importing this never touches the database
 * layer). `mapWith(Number)`: Postgres returns a count as bigint text.
 */
const userEventCountOf = (status: 'watching' | 'going') =>
  sql<number>`(${db
    .select({ total: count() })
    .from(userEvents)
    .where(
      and(eq(userEvents.eventId, events.id), eq(userEvents.status, status)),
    )})`.mapWith(Number);

/** Fans Watching a show. */
export const watchingCountOf = () => userEventCountOf('watching');

/** Fans who went to a show: the Concerts count (`going` marks). */
export const wentCountOf = () => userEventCountOf('going');
