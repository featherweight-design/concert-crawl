/**
 * Cross-venue presale detection.
 *
 * Some venues (e.g. Cervantes' Masterpiece Ballroom) sell presale tickets for
 * shows physically hosted at another venue (e.g. Ogden Theatre). Those presale
 * listings often surface on the selling venue's events page with titles like
 *   "Earl Sweatshirt & MIKE w/ Harrison (Surf Gang) AT OGDEN THEATRE".
 *
 * Without filtering these out the same physical event gets stored under two
 * venues — once (correctly) under the host venue's crawl, and once (incorrectly)
 * under the selling venue's crawl. Users then see two cards for one show.
 *
 * This helper detects "AT <VENUE NAME>" or "@ <VENUE NAME>" markers in an
 * extracted event title and returns the matched venue when the marker names
 * a *different* known venue from the one currently being crawled. The caller
 * (the upsert step in `crawlVenue`) is expected to skip those rows and let
 * the host venue's crawl produce the canonical row.
 *
 * No DB coupling here — venues are passed in by the caller. The crawler entry
 * point loads the venue list once per run and threads it through.
 *
 * See GitHub issue #605.
 */

export interface CrossVenueCandidate {
  id: string
  slug: string
  name: string
}

export interface CrossVenueMatch {
  matchedVenueId: string
  matchedVenueSlug: string
  matchedVenueName: string
}

// Matches " AT <name>" or " @ <name>" near the end of the title.
//
// - `\bat\b` — case-insensitive word "at" (so "Live At Last" matches the word,
//   but the *venue* check below filters such phrases out because "Last" isn't
//   a known venue).
// - `@` — explicit at-sign separator.
// - Captures the rest of the string after the marker so we can compare against
//   known venue names (which may themselves contain whitespace, apostrophes,
//   periods, etc.).
//
// We require the marker to be preceded by whitespace and followed by whitespace,
// which keeps incidental "at" inside other words from matching.
const AT_MARKER = /\s(?:at|@)\s+(.+?)\s*$/i

/**
 * Returns the matched cross-venue candidate when the title contains a
 * "AT <other-venue>" or "@ <other-venue>" marker, where <other-venue> is a
 * venue in `candidates` *other than* the one identified by `sourceVenueId`.
 *
 * Returns `null` when:
 *   - the title contains no AT/@ marker
 *   - the marker text doesn't match any known venue
 *   - the marker text matches the *same* venue the crawl is currently scoped to
 *     (a venue can legitimately put its own name in an event title)
 */
export function detectCrossVenuePresale(args: {
  title: string
  sourceVenueId: string
  candidates: CrossVenueCandidate[]
}): CrossVenueMatch | null {
  const { title, sourceVenueId, candidates } = args

  const markerMatch = AT_MARKER.exec(title)
  if (!markerMatch) return null

  const markerText = markerMatch[1]?.trim()
  if (!markerText) return null

  const markerLower = markerText.toLowerCase()

  // Find any candidate venue whose name appears in the marker text. We allow
  // the marker to *equal* the venue name or *contain* the venue name (handles
  // trailing punctuation, room qualifiers, etc.). Matching is case-insensitive.
  for (const candidate of candidates) {
    const candidateName = candidate.name.trim().toLowerCase()
    if (candidateName.length === 0) continue

    const matchesName =
      markerLower === candidateName || markerLower.includes(candidateName)

    if (!matchesName) continue

    // Self-venue: the title legitimately names its own host venue. Don't skip.
    if (candidate.id === sourceVenueId) return null

    return {
      matchedVenueId: candidate.id,
      matchedVenueSlug: candidate.slug,
      matchedVenueName: candidate.name,
    }
  }

  return null
}
