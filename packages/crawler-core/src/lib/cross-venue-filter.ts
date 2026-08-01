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
  /** Null when the marker named a venue we don't have in the DB. */
  matchedVenueId: string | null
  /** Null when the marker named a venue we don't have in the DB. */
  matchedVenueSlug: string | null
  /** The candidate's seeded name, or the verbatim marker text when unknown. */
  matchedVenueName: string
  reason: CrossVenueReason
}

/**
 * `known-venue` — the marker named another venue in `candidates`.
 * `ticket-url` — the marker named a venue we don't crawl, and the ticket URL
 * independently names that same venue. See issue #1286.
 */
export type CrossVenueReason = 'known-venue' | 'ticket-url'

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

// Collapses a string to lowercase alphanumerics. Ticket vendors slugify venue
// names inconsistently — Etix renders "Cervantes' Masterpiece Ballroom" as
// `cervantesmasterpiece-ballroom`, dropping the apostrophe AND the space after
// it — so neither raw substring nor hyphen-slug comparison is reliable.
// Alphanumeric-only comparison survives every punctuation scheme we've seen.
function alphanumeric(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Path portion of a ticket URL, with the query string and fragment dropped.
 *
 * This is load-bearing, not tidying: Etix appends `?cobrand=Cervantes` to every
 * link Cervantes sells — including the off-site ones — so the query string
 * names the SELLING venue and would veto every skip. Only the path encodes the
 * host venue.
 *
 * Parsed by hand rather than with `new URL()` so a malformed href is just a
 * value that corroborates nothing, rather than an exception we'd have to
 * swallow. Relative hrefs work too: an href with no authority is already a path,
 * so it's returned whole — slicing from its first slash would drop the leading
 * segment, which is often the one naming the venue.
 * Returns '' when there is no path, which never corroborates.
 */
const AUTHORITY_PREFIX = /^([a-z][a-z0-9+.-]*:)?\/\//i

function ticketPath(url: string): string {
  const withoutQuery = url.split(/[?#]/)[0] ?? ''
  if (!AUTHORITY_PREFIX.test(withoutQuery)) return withoutQuery

  const withoutAuthority = withoutQuery.replace(AUTHORITY_PREFIX, '')
  const pathStart = withoutAuthority.indexOf('/')
  return pathStart === -1 ? '' : withoutAuthority.slice(pathStart)
}

// Shortest source-venue token we'll trust for URL corroboration. Below this,
// incidental substring hits get too likely.
const MIN_SOURCE_TOKEN_LENGTH = 4

// Alphanumeric characters of the marker that must appear in the URL residue.
// Long enough that an incidental hit is implausible, short enough to survive a
// vendor truncating the venue name.
const MIN_MARKER_PREFIX_LENGTH = 10

/**
 * The source venue's distinguishing first word, alphanumeric-only — the token
 * we look for in a ticket URL. Deliberately the FIRST word rather than the
 * whole name: Cervantes sells for two rooms under one venue row, and its Other
 * Side listings slugify to `cervantesother-side`, which the full-name token
 * `cervantesmasterpieceballroom` would not match. Matching on `cervantes`
 * covers both rooms.
 *
 * Erring short is the safe direction here: a shorter, more generic token
 * matches MORE URLs, which means fewer skips — false negatives (a bad row we
 * fail to drop), never false positives (a legitimate row we wrongly drop).
 */
function sourceVenueToken(sourceVenueName: string): string {
  const [firstWord] = normalizeVenueName(sourceVenueName).split(/\s+/)
  return alphanumeric(firstWord ?? '')
}

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
 * When no candidate matches, falls back to ticket-URL corroboration so shows at
 * venues we don't crawl are caught too (issue #1286).
 *
 * Returns `null` when:
 *   - the title contains no AT/@ marker
 *   - the matching candidate IS the source venue (legitimate self-naming)
 *   - no candidate matches AND the ticket URL doesn't corroborate the marker
 */
export function detectCrossVenuePresale(args: {
  title: string
  sourceVenueId: string
  sourceVenueName: string
  ticketUrl?: string | null | undefined
  candidates: CrossVenueCandidate[]
}): CrossVenueMatch | null {
  const { title, sourceVenueId, sourceVenueName, ticketUrl, candidates } = args

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
      reason: 'known-venue',
    }
  }

  return detectViaTicketUrl({ title, markerText, sourceVenueName, ticketUrl })
}

/**
 * Fallback for markers naming a venue we don't crawl (issue #1286). The known-
 * venue lookup can't help there, so the ticket URL has to supply the second
 * signal — but only a POSITIVE one counts.
 *
 * The tempting rule, "the URL never mentions the source venue, so the show must
 * be elsewhere", is wrong. Ticketmaster encodes the city, not the venue
 * (`/emei-night-at-the-opera-tour-denver-colorado-10-08-2026/event/…`), so its
 * links never mention any venue and that rule drops legitimate shows. A dry run
 * over 946 upcoming prod rows on 2026-08-01 produced six such false positives.
 *
 * So we require the URL to name the marker's venue *on its own*: strip the
 * slugified title out of the path, and look for the marker in what's left. Etix
 * appends the host venue after the title
 * (`/brother-ali-at-the-black-sheep-denver-the-black-sheep`), so the residue
 * says `the-black-sheep` independently of the title. Vendors that encode only a
 * city leave a residue that corroborates nothing, and we correctly keep the row.
 */
function detectViaTicketUrl(args: {
  title: string
  markerText: string
  sourceVenueName: string
  ticketUrl?: string | null | undefined
}): CrossVenueMatch | null {
  const { title, markerText, sourceVenueName, ticketUrl } = args

  if (!ticketUrl) return null

  const token = sourceVenueToken(sourceVenueName)
  if (token.length < MIN_SOURCE_TOKEN_LENGTH) return null

  // The marker names the source venue, so the title isn't pointing elsewhere
  // regardless of what the URL says.
  const markerAlnum = alphanumeric(markerText)
  if (markerAlnum.includes(token)) return null

  const pathAlnum = alphanumeric(ticketPath(ticketUrl))

  // The URL names the source venue — it's saying the show is right here.
  if (pathAlnum.includes(token)) return null

  // Everything in the path that isn't the title. Vendors truncate long titles,
  // in which case nothing is removed and the residue is the whole path — still
  // safe, because the marker then has to survive the prefix test below against
  // a string that already failed to contain the source venue.
  const residue = pathAlnum.split(alphanumeric(title)).join('')

  // Compare on a prefix, not the whole marker: Etix renders
  // "TWO RIVERS PARK, GLENWOOD SPRINGS" as just `two-rivers-park`, so requiring
  // the full marker would miss it. The prefix must be long enough that an
  // incidental hit is implausible — markers shorter than this can't be
  // corroborated at all, which drops "…At Once Tour" and "…(Pre-Fest at Ratio)".
  if (markerAlnum.length < MIN_MARKER_PREFIX_LENGTH) return null
  if (!residue.includes(markerAlnum.slice(0, MIN_MARKER_PREFIX_LENGTH)))
    return null

  return {
    matchedVenueId: null,
    matchedVenueSlug: null,
    matchedVenueName: markerText,
    reason: 'ticket-url',
  }
}
