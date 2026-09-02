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
  'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)'
