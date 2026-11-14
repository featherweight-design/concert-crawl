// When the daily crawl runs: the pure schedule, shared so the API (the next
// nightly) and the web (a night's scheduled time) name the same minute. The
// production gate stays in the API (apps/api/src/lib/crawl-schedule.ts).

/**
 * When the daily crawl runs, in UTC. `apps/api/vercel.json` holds the cron
 * entry (`7 9 * * *` on `/v1/internal/cron/crawler-daily`) and a test keeps the
 * two equal. 09:07 UTC is 3:07 AM Mountain in summer, 2:07 AM in winter.
 */
export const CRAWLER_DAILY_CRON_UTC = { hour: 9, minute: 7 } as const;

/** The next daily crawl strictly after `now`. */
export const nextCrawlAfter = (now: Date): Date => {
  const { hour, minute } = CRAWLER_DAILY_CRON_UTC;
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hour,
      minute,
    ),
  );
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
};

/**
 * When a night's crawl was due, ISO UTC, for its Mountain Time date
 * (`YYYY-MM-DD`). 09:07 UTC falls on the same date in Mountain Time, winter
 * or summer, so the night's date is the cron's UTC date.
 */
export const scheduledCrawlAt = (night: string): string => {
  const { hour, minute } = CRAWLER_DAILY_CRON_UTC;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${night}T${pad(hour)}:${pad(minute)}:00.000Z`;
};
