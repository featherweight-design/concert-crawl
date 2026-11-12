// Where our records start: the first month with crawled shows we stand behind.
// One constant, read by the API (the Add-a-show date floor) and the web (the
// "since March 2026" copy), so the two can never disagree. It only moves with
// a licensed backfill, which ships as a deploy anyway, so it is not served by
// the API. Everything derives from this one value; formatting is in UTC so the
// month can never slip a timezone.

export const RECORDS_START_MONTH = '2026-03';

const startDate = (): Date => new Date(`${RECORDS_START_MONTH}-01T00:00:00Z`);

const format = (options: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(
    startDate(),
  );

/** First day of the records window, `YYYY-MM-DD`. The API's date floor. */
export const recordsStartFloor = (): string => `${RECORDS_START_MONTH}-01`;

/** `March 2026`. */
export const recordsStartLabel = (): string =>
  format({ month: 'long', year: 'numeric' });

/** `MAR 2026`. */
export const recordsStartShort = (): string =>
  format({ month: 'short', year: 'numeric' }).toUpperCase();
