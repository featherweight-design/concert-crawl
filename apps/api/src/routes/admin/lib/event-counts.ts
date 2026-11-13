import { and, count, eq, sql } from 'drizzle-orm';
import { db, events, userEvents } from '@concert-crawl/db';

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
