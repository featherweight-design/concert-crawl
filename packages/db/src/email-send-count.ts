/**
 * The account-wide email count. One Resend account (and its daily quota) is
 * shared with another app, so every email the API and the crawler send counts
 * in one Mountain Time calendar-day row of `rate_limit_buckets`. (Two rare
 * senders outside the apps aren't counted: the Deploy to Production
 * workflow's rollback notice and the local `email:preview --send` script.)
 * The API refuses mail to users past the cap;
 * operational alerts are counted but always go out (orchestrator ruling,
 * 2026-11-14).
 *
 * This module is the only writer of the day's row, so the count is exact:
 * every send adds one, and a claim that is refused or whose send fails takes
 * its one back. (The API's general limiter clamps a refused key's count at
 * max + 1, which would erase alerts counted past the cap, so it is not used
 * for this row.)
 */
import { and, eq, gt, sql } from 'drizzle-orm';
import type { Database } from './client.js';
import { rateLimitBuckets } from './schema/index.js';

/**
 * Longer than a day, so a key's row outlives its own day (DST makes one 25
 * hours) and the key itself, not the window, starts the next day's count.
 */
export const EMAIL_DAY_WINDOW_MS = 26 * 60 * 60 * 1000;

/** Until Resend Pro: the free 100 a day are shared with another app. */
export const DEFAULT_EMAIL_DAILY_SEND_CAP = 30;

/** The share of the cap that raises the day's one warning. */
export const EMAIL_CAP_WARN_SHARE = 0.8;

/** The day's cap from `EMAIL_DAILY_SEND_CAP`; missing or invalid is 30. */
export const emailDailySendCap = (): number => {
  const raw = Number(process.env['EMAIL_DAILY_SEND_CAP']);
  return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_EMAIL_DAILY_SEND_CAP;
};

const mtDate = (now: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

/** Today's account-wide email row, by Mountain Time calendar day. */
export const emailDayKey = (now: Date = new Date()): string =>
  `email-day:${mtDate(now)}`;

const warnKey = (now: Date): string => `email-day-warned:${mtDate(now)}`;

const freshResetAt = () =>
  sql`now() + ${EMAIL_DAY_WINDOW_MS}::integer * interval '1 millisecond'`;

/**
 * Add one send to the day and return the day's count after it. Throws on a
 * store error; the caller decides whether that refuses the send.
 */
export const countEmailSend = async (
  database: Database,
  now: Date = new Date(),
): Promise<number> => {
  const expired = sql`${rateLimitBuckets.resetAt} <= now()`;
  const rows = await database
    .insert(rateLimitBuckets)
    .values({ key: emailDayKey(now), count: 1, resetAt: freshResetAt() })
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

/** Take back one send from the day it was counted in (a refusal, a failure). */
export const uncountEmailSend = async (
  database: Database,
  now: Date = new Date(),
): Promise<void> => {
  await database
    .update(rateLimitBuckets)
    .set({ count: sql`${rateLimitBuckets.count} - 1` })
    .where(
      and(
        eq(rateLimitBuckets.key, emailDayKey(now)),
        gt(rateLimitBuckets.resetAt, sql`now()`),
        gt(rateLimitBuckets.count, 0),
      ),
    );
};

/**
 * True for the first caller each Mountain Time day whose count reaches 80% of
 * the cap: that caller raises the day's one warning. Throws on a store error.
 */
export const claimEmailCapWarning = async (
  database: Database,
  count: number,
  cap: number,
  now: Date = new Date(),
): Promise<boolean> => {
  if (count < Math.ceil(cap * EMAIL_CAP_WARN_SHARE)) return false;
  const expired = sql`${rateLimitBuckets.resetAt} <= now()`;
  // Claimed by the first insert, or by reopening yesterday's expired row; a
  // live row means today's warning has gone.
  const rows = await database
    .insert(rateLimitBuckets)
    .values({ key: warnKey(now), count: 1, resetAt: freshResetAt() })
    .onConflictDoUpdate({
      target: rateLimitBuckets.key,
      set: { count: 1, resetAt: sql`excluded.reset_at` },
      setWhere: expired,
    })
    .returning({ key: rateLimitBuckets.key });
  return rows.length > 0;
};
