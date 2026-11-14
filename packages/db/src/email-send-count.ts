/**
 * The account-wide email count. One Resend account (and its daily quota) is
 * shared with another app, so every email this project sends, from the API
 * or the crawler, counts against one Mountain Time calendar-day bucket in
 * `rate_limit_buckets`. The API refuses user-addressed mail past the cap;
 * operational alerts are counted but always go out (orchestrator ruling,
 * 2026-11-14). The bucket's row is the API limiter's: same key, same
 * fixed-window columns, so either side can write it.
 */
import { sql } from 'drizzle-orm';
import type { Database } from './client.js';
import { rateLimitBuckets } from './schema/index.js';

/**
 * Longer than a day, so a key's row outlives its own day (DST makes one 25
 * hours) and the key itself, not the window, starts the next day's count.
 */
export const EMAIL_DAY_WINDOW_MS = 26 * 60 * 60 * 1000;

const mtDate = (now: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

/** Today's account-wide email bucket, by Mountain Time calendar day. */
export const emailDayKey = (now: Date = new Date()): string =>
  `email-day:${mtDate(now)}`;

/** The once-a-day claim for the 80% warning. */
export const emailDayWarnKey = (now: Date = new Date()): string =>
  `email-day-warned:${mtDate(now)}`;

/**
 * Count one send that must go out regardless of the cap (an alert to the
 * admin address). Returns the day's count after it. Throws on a store error;
 * callers catch, since a lost count must never stop an alert.
 */
export const countEmailSend = async (
  database: Database,
  now: Date = new Date(),
): Promise<number> => {
  const expired = sql`${rateLimitBuckets.resetAt} <= now()`;
  const rows = await database
    .insert(rateLimitBuckets)
    .values({
      key: emailDayKey(now),
      count: 1,
      resetAt: sql`now() + ${EMAIL_DAY_WINDOW_MS}::integer * interval '1 millisecond'`,
      userId: null,
    })
    .onConflictDoUpdate({
      target: rateLimitBuckets.key,
      set: {
        count: sql`CASE WHEN ${expired} THEN 1 ELSE ${rateLimitBuckets.count} + 1 END`,
        resetAt: sql`CASE WHEN ${expired} THEN excluded.reset_at ELSE ${rateLimitBuckets.resetAt} END`,
      },
    })
    .returning({ count: rateLimitBuckets.count });
  return rows[0]?.count ?? 0;
};
