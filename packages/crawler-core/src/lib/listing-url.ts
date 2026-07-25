/**
 * Recognize when an extracted URL is just the page we crawled.
 *
 * Extractors regularly hand back the venue's own calendar index as an
 * event's `ticketUrl` — it is, after all, the most prominent link on the
 * page. The consumer "Get tickets" CTA prefers `ticketUrl` over
 * `eventUrl`, so one of those index URLs masks a perfectly good per-event
 * page and drops the fan on a list of every show at the venue (#1152).
 *
 * Comparison is origin + path only, with a trailing slash and letter case
 * on the host normalized away, so `https://WWW.Venue.com/events` and
 * `https://www.venue.com/events/` are the same page. Query strings are
 * ignored on the listing side, but any query string on the candidate side
 * makes it a non-match. That is deliberately conservative: `/events/?id=1489047`
 * genuinely points at one show, and we would rather keep an index URL
 * carrying tracking params than discard a working per-event link.
 */
function pagePath(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  const path = parsed.pathname.replace(/\/+$/, '')
  return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}`
}

export function isListingPageUrl(
  candidate: string | null | undefined,
  listingUrls: readonly (string | null | undefined)[],
): boolean {
  if (candidate == null) return false
  let parsed: URL
  try {
    parsed = new URL(candidate.trim())
  } catch {
    return false
  }
  // Any query string is treated as a non-match, because it may select one
  // show within the page. See the note above on why erring this way.
  if (parsed.search !== '') return false

  const candidatePath = pagePath(candidate)
  if (candidatePath == null) return false

  return listingUrls.some((listing) => {
    if (listing == null) return false
    const listingPath = pagePath(listing)
    return listingPath != null && listingPath === candidatePath
  })
}
