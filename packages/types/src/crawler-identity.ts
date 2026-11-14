/**
 * The one user agent every outbound request from this product carries.
 *
 * It lives here, in the package with no dependencies, because three groups of
 * callers have to agree on it and two of them are not the crawler: the fetchers
 * that send it, the admin robots.txt checker that asks a site what it thinks of
 * it, and `/bot`, which publishes it to venue operators as a fact they can grep
 * their logs for. It was declared eleven separate times before #1228, which
 * made the page that publishes it capable of being quietly wrong.
 *
 * The `+` URL must resolve. Changing this string without changing the page it
 * points at is the failure this constant exists to prevent.
 */
export const CRAWLER_USER_AGENT =
  'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)';

/**
 * The crawl rules' floor: never less than 3 seconds before each page or API
 * call we request from a venue, whatever its stored `crawl_delay_ms` says (the admin form once
 * accepted 1 s). Jitter is added on top of this, never taken from it.
 *
 * Here for the same reason as the user agent: the crawler enforces it, the
 * API's venue schema refuses less, the admin form starts a legacy row at it,
 * and `/bot` promises it. One declaration keeps them from drifting apart.
 */
export const MIN_CRAWL_DELAY_MS = 3_000;
