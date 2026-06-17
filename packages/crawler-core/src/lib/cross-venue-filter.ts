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

// Common Denver venue suffixes. Stripped from BOTH the candidate name and
// the marker text so "AT RED ROCKS" matches the seed value
// "Red Rocks Amphitheatre". The suffix list mirrors the actual seed shapes
// (Amphitheatre/Amphitheater, Theatre/Theater, Ballroom, Hall, Auditorium,
// Arena, Lounge). Keep this conservative — wider stripping risks
// false positives.
const VENUE_SUFFIX =
  /\s+(amphitheatre|amphitheater|theatre|theater|ballroom|hall|auditorium|arena|lounge)$/i

// Leading "The " is also dropped because some venues are seeded with it
// ("The Fillmore Auditorium") and some event titles drop it ("AT FILLMORE").
const THE_PREFIX = /^the\s+/i

/**
 * Returns a lowercase, trimmed form of a venue name with the leading "The "
 * and any trailing common-venue suffix removed. Pure helper, exported for
 * tests + callers that want to surface the canonical short form.
 *
 * Examples:
 *   "Red Rocks Amphitheatre" → "red rocks"
 *   "The Fillmore Auditorium" → "fillmore"
 *   "Ogden Theatre"           → "ogden"
 *   "Summit Music Hall"       → "summit music"
 *   "Hi-Dive"                 → "hi-dive"     (no suffix)
 */
export function normalizeVenueName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(THE_PREFIX, '')
    .replace(VENUE_SUFFIX, '')
    .trim()
}

/**
 * Returns the matched cross-venue candidate when the title contains a
 * "AT <other-venue>" or "@ <other-venue>" marker, where <other-venue> is a
 * venue in `candidates` *other than* the one identified by `sourceVenueId`.
 *
 * Matching is permissive: each candidate is compared in both its full and
 * normalized (suffix-stripped, "The"-stripped) form, against both the full
 * and normalized form of the marker text. This catches the common shortened
 * title pattern ("AT RED ROCKS" against seed "Red Rocks Amphitheatre") while
 * still flagging unambiguous full-name matches.
 *
 * Returns `null` when:
 *   - the title contains no AT/@ marker
 *   - no candidate venue matches the marker text (full or normalized)
 *   - the matching candidate IS the source venue (legitimate self-naming)
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

  const markerFull = markerText.toLowerCase()
  const markerShort = normalizeVenueName(markerText)

  for (const candidate of candidates) {
    const candidateFull = candidate.name.trim().toLowerCase()
    const candidateShort = normalizeVenueName(candidate.name)
    if (candidateFull.length === 0) continue
    // Don't fall through to substring matching on an empty short form —
    // "" is a substring of every string, which would match every venue.
    if (candidateShort.length === 0) continue

    const matchesName =
      markerFull === candidateFull ||
      markerFull.includes(candidateFull) ||
      markerShort === candidateShort ||
      markerShort.includes(candidateShort) ||
      markerFull.includes(candidateShort) ||
      markerShort.includes(candidateFull)

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
