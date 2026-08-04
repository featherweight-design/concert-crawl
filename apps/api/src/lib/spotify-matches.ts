// apps/api/src/lib/spotify-matches.ts
//
// Denver-match summary for a user's Spotify-sourced artist set (#763 PR 5,
// eng spec §9.1). Matching is canonical-name based — exactly the rule the
// taste surfaces use:
//   events.canonical_artist = ANY($names)
//     OR events.canonical_headliners && $names
//     OR events.canonical_supporting && $names
// scoped to consumer-visible upcoming events (same visibility filter as the
// events list: upcoming status, date >= today MT, not hidden, not missing).
import {
  type SQL,
  and,
  arrayOverlaps,
  asc,
  eq,
  exists,
  gte,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm'
import { db, events, userArtistFollows, venues } from '@concert-crawl/db'
import type {
  SpotifyTastePick,
  SpotifyTastePickReason,
} from '@concert-crawl/types'
import {
  loadPriceByTierByEventId,
  resolveDisplayPrice,
} from './price-aggregation/index.js'
import { SPOTIFY_FOLLOW_SOURCES } from './spotify-sync.js'
import { todayInTimezone } from './time.js'

// events.date holds event-local (Mountain Time) calendar dates — see the
// events route for the same reasoning.
const MT_TIME_ZONE = 'America/Denver'

export interface SpotifyMatchSummary {
  denverArtistCount: number
  denverShowCount: number
  matchedArtists: string[]
}

export const EMPTY_MATCH_SUMMARY: SpotifyMatchSummary = {
  denverArtistCount: 0,
  denverShowCount: 0,
  matchedArtists: [],
}

interface FollowName {
  artistName: string
  canonicalName: string
  source: (typeof userArtistFollows.$inferSelect)['source']
  rank: number | null
}

const loadSpotifyFollowNames = async (
  userId: string,
): Promise<FollowName[]> => {
  return (
    db
      .select({
        artistName: userArtistFollows.artistName,
        canonicalName: userArtistFollows.canonicalName,
        source: userArtistFollows.source,
        rank: userArtistFollows.rank,
      })
      .from(userArtistFollows)
      .where(
        and(
          eq(userArtistFollows.userId, userId),
          inArray(userArtistFollows.source, [...SPOTIFY_FOLLOW_SOURCES]),
        ),
      )
      // Deterministic first-wins pick in displayByCanonical when a canonical
      // exists under both sources: 'spotify_followed' sorts before
      // 'spotify_top', then artistName breaks remaining ties.
      .orderBy(asc(userArtistFollows.source), asc(userArtistFollows.artistName))
  )
}

interface MatchedEventRow {
  id: string
  canonicalArtist: string
  canonicalHeadliners: string[] | null
  canonicalSupporting: string[] | null
}

// Shared §9.1 condition: consumer-visible upcoming events matching the
// canonical set (headliner equality OR co-headliner/supporting overlap).
//
// canonical_headliners is the co-headliner arm (#1203/#1419): only
// headliners[0] reaches canonical_artist, so without it a user who follows
// the SECOND act on a co-headline bill gets no match — no recommendation and
// no fan-out. It supplements the equality arm rather than replacing it, since
// that arm is the indexed fast path and still covers rows the crawler has not
// rewritten. The mirror of this rule in routes/artists-public.ts and
// routes/search.ts must not diverge.
const matchedUpcomingCondition = (canonicalNames: string[]): SQL => {
  // Total: inArray/arrayOverlaps with [] would generate invalid SQL.
  if (canonicalNames.length === 0) return sql`false`
  return (
    and(
      eq(events.status, 'upcoming'),
      gte(events.date, todayInTimezone(MT_TIME_ZONE)),
      eq(events.hiddenFromConsumer, false),
      isNull(events.firstMissingAt),
      // A deactivated venue's shows must not drive fan-out or recommendations
      // (#1406). Correlated EXISTS rather than a join so the two consumers of
      // this condition keep their existing query shapes — getTastePicks
      // already joins venues, loadMatchedUpcomingEvents does not.
      exists(
        db
          .select({ one: sql`1` })
          .from(venues)
          .where(and(eq(venues.id, events.venueId), eq(venues.active, true))),
      ),
      or(
        inArray(events.canonicalArtist, canonicalNames),
        // Array-overlap (&&) halves of the §9.1 match rule.
        arrayOverlaps(events.canonicalHeadliners, canonicalNames),
        arrayOverlaps(events.canonicalSupporting, canonicalNames),
      ),
    ) ?? sql`false`
  )
}

const loadMatchedUpcomingEvents = async (
  canonicalNames: string[],
): Promise<MatchedEventRow[]> => {
  if (canonicalNames.length === 0) return []
  return db
    .select({
      id: events.id,
      canonicalArtist: events.canonicalArtist,
      canonicalHeadliners: events.canonicalHeadliners,
      canonicalSupporting: events.canonicalSupporting,
    })
    .from(events)
    .where(matchedUpcomingCondition(canonicalNames))
}

// Full summary for the connection payload: how many of the user's artists
// have an upcoming Denver show, how many shows that is, and the display
// names of the matched artists.
export async function getSpotifyMatchSummary(
  userId: string,
): Promise<SpotifyMatchSummary> {
  const follows = await loadSpotifyFollowNames(userId)
  if (follows.length === 0) return EMPTY_MATCH_SUMMARY

  const displayByCanonical = new Map<string, string>()
  for (const follow of follows) {
    if (!displayByCanonical.has(follow.canonicalName)) {
      displayByCanonical.set(follow.canonicalName, follow.artistName)
    }
  }
  const canonicalNames = [...displayByCanonical.keys()]

  const matchedEvents = await loadMatchedUpcomingEvents(canonicalNames)
  if (matchedEvents.length === 0) return EMPTY_MATCH_SUMMARY

  const followSet = new Set(canonicalNames)
  const matchedCanonicals = new Set<string>()
  for (const event of matchedEvents) {
    if (followSet.has(event.canonicalArtist)) {
      matchedCanonicals.add(event.canonicalArtist)
    }
    for (const billed of [
      ...(event.canonicalHeadliners ?? []),
      ...(event.canonicalSupporting ?? []),
    ]) {
      if (followSet.has(billed)) matchedCanonicals.add(billed)
    }
  }

  // Sorted so the chip list is deterministic — the event query has no
  // ORDER BY, and Set iteration would leak that row order. Uncapped: the
  // connect-success "WE RECOGNIZED" row folds past 6 behind an expandable
  // "+N more", and the set is naturally bounded by the user's Denver matches.
  const matchedArtists = [...matchedCanonicals]
    .flatMap((canonical) => displayByCanonical.get(canonical) ?? [])
    .sort((left, right) => left.localeCompare(right))

  return {
    denverArtistCount: matchedCanonicals.size,
    denverShowCount: matchedEvents.length,
    matchedArtists,
  }
}

// Per-event follow matcher for the events list/detail `followedArtists`
// overlay (#763 PR 6, eng spec §9.2). One query per request (the user's
// Spotify-sourced follow names), then pure in-memory overlap against each
// row's canonical columns — no per-event queries. Returns null when the user
// has no Spotify-sourced follow rows (never connected, or revoked-and-purged)
// so the routes can omit the field entirely; an `error`-status connection
// retains its rows, so highlighting deliberately continues (§8.4).
export interface FollowedArtistMatcher {
  matchEvent: (event: {
    canonicalArtist: string | null
    canonicalHeadliners: string[] | null
    canonicalSupporting: string[] | null
  }) => string[]
}

export async function getFollowedArtistMatcher(
  userId: string,
): Promise<FollowedArtistMatcher | null> {
  const follows = await loadSpotifyFollowNames(userId)
  if (follows.length === 0) return null

  const displayByCanonical = new Map<string, string>()
  for (const follow of follows) {
    if (!displayByCanonical.has(follow.canonicalName)) {
      displayByCanonical.set(follow.canonicalName, follow.artistName)
    }
  }

  return {
    matchEvent: (event) => {
      const matched = new Set<string>()
      if (
        event.canonicalArtist !== null &&
        displayByCanonical.has(event.canonicalArtist)
      ) {
        matched.add(event.canonicalArtist)
      }
      for (const billed of [
        ...(event.canonicalHeadliners ?? []),
        ...(event.canonicalSupporting ?? []),
      ]) {
        if (displayByCanonical.has(billed)) matched.add(billed)
      }
      // localeCompare sort mirrors getSpotifyMatchSummary — deterministic
      // regardless of row/Set iteration order.
      return [...matched]
        .flatMap((canonical) => displayByCanonical.get(canonical) ?? [])
        .sort((left, right) => left.localeCompare(right))
    },
  }
}

// EXISTS condition for the events-list `taste=1` filter (#763 PR 7, eng spec
// §9.3). Correlated against the outer `events` row so it AND-composes with the
// list endpoint's other conditions and applies identically to the count and
// row queries. Matches the §9.1 rule: the viewer has a Spotify-sourced follow
// row whose canonical name equals the event's canonical headliner OR appears
// in its canonical co-headliner or supporting set. NULL canonical columns
// simply never match.
export function spotifyTasteCondition(userId: string): SQL {
  return exists(
    db
      .select({ one: sql`1` })
      .from(userArtistFollows)
      .where(
        and(
          eq(userArtistFollows.userId, userId),
          inArray(userArtistFollows.source, [...SPOTIFY_FOLLOW_SOURCES]),
          or(
            eq(userArtistFollows.canonicalName, events.canonicalArtist),
            // Correlated halves of the §9.1 overlap rule — `= ANY(NULL)` is
            // NULL (falsy), so events without co-headliners or supporting
            // acts, and rows predating the backfill, are safe.
            sql`${userArtistFollows.canonicalName} = ANY(${events.canonicalHeadliners})`,
            sql`${userArtistFollows.canonicalName} = ANY(${events.canonicalSupporting})`,
          ),
        ),
      ),
  )
}

// Event ids for the auto-watch opt-in backfill: every currently-matched
// upcoming show. PR 10's fan-out only covers events that appear AFTER the
// toggle flips, so the opt-in moment backfills the existing matches (the
// sheet promises "we'll add all N to your Watching list now").
export async function getMatchedUpcomingEventIds(
  userId: string,
): Promise<string[]> {
  const follows = await loadSpotifyFollowNames(userId)
  if (follows.length === 0) return []
  const canonicalNames = [...new Set(follows.map((row) => row.canonicalName))]
  const matched = await loadMatchedUpcomingEvents(canonicalNames)
  return matched.map((event) => event.id)
}

// True when `candidate` is a strictly stronger reason than `current` under
// the §9.4 ordering: any top-artist match beats a followed match, and a
// lower rank beats a higher one (rank 1 strongest). Ties keep `current`
// (first-wins), which is deterministic because callers iterate follows in
// the loadSpotifyFollowNames order and event artists headliner-first.
const isStrongerReason = (
  candidate: SpotifyTastePickReason,
  current: SpotifyTastePickReason | null,
): boolean => {
  if (current === null) return true
  if (candidate.kind === 'top' && current.kind === 'top') {
    return candidate.rank < current.rank
  }
  return candidate.kind === 'top' && current.kind === 'followed'
}

// Discovery shelf picks (#763 PR 8, eng spec §9.4): the viewer's matched
// upcoming events ranked deterministically — top-artist rank ascending
// first, then followed-only matches, soonest event date as the tiebreaker
// (with show time + id breaking exact date ties so the order is total).
// Each pick carries the strongest reason it matched, for the reason chips.
export async function getTastePicks(
  userId: string,
  limit: number,
): Promise<SpotifyTastePick[]> {
  const follows = await loadSpotifyFollowNames(userId)
  if (follows.length === 0) return []

  // Strongest reason per canonical name: a spotify_top row (with rank)
  // beats a spotify_followed row for the same artist; among top rows the
  // smallest rank wins.
  const reasonByCanonical = new Map<string, SpotifyTastePickReason>()
  for (const follow of follows) {
    const candidate: SpotifyTastePickReason =
      follow.source === 'spotify_top' && follow.rank !== null
        ? { kind: 'top', rank: follow.rank, artistName: follow.artistName }
        : { kind: 'followed', artistName: follow.artistName }
    if (
      isStrongerReason(
        candidate,
        reasonByCanonical.get(follow.canonicalName) ?? null,
      )
    ) {
      reasonByCanonical.set(follow.canonicalName, candidate)
    }
  }

  // Date/time/id ORDER BY gives every row a deterministic "soonest" index;
  // the in-memory sort below only reorders by reason strength, so equal
  // reasons keep this soonest-first order (the §9.4 tiebreaker).
  const rows = await db
    .select({
      id: events.id,
      artist: events.artist,
      title: events.title,
      imageUrl: events.imageUrl,
      date: events.date,
      showTime: events.showTime,
      ticketPriceMin: events.ticketPriceMin,
      canonicalArtist: events.canonicalArtist,
      canonicalHeadliners: events.canonicalHeadliners,
      canonicalSupporting: events.canonicalSupporting,
      venueName: venues.name,
      venueSlug: venues.slug,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(matchedUpcomingCondition([...reasonByCanonical.keys()]))
    .orderBy(asc(events.date), asc(events.showTime), asc(events.id))

  const scored: Array<{
    row: (typeof rows)[number]
    reason: SpotifyTastePickReason
    soonestIndex: number
  }> = []
  for (const [index, row] of rows.entries()) {
    // Headliner first, then co-headliners, then supporting in stored order —
    // with first-wins ties in isStrongerReason this is deterministic per
    // event. Co-headliners must be here or a row matched solely by that arm
    // would find no reason and be dropped by the `continue` below.
    let reason: SpotifyTastePickReason | null = null
    const eventCanonicals = [
      ...(row.canonicalArtist !== null ? [row.canonicalArtist] : []),
      // canonical_headliners repeats the primary headliner, so drop it here
      // rather than look the same reason up twice.
      ...(row.canonicalHeadliners ?? []).filter(
        (name) => name !== row.canonicalArtist,
      ),
      ...(row.canonicalSupporting ?? []),
    ]
    for (const canonical of eventCanonicals) {
      const candidate = reasonByCanonical.get(canonical)
      if (candidate && isStrongerReason(candidate, reason)) {
        reason = candidate
      }
    }
    if (reason === null) continue // defensive — the WHERE guarantees a match
    scored.push({ row, reason, soonestIndex: index })
  }

  scored.sort((left, right) => {
    if (left.reason.kind !== right.reason.kind) {
      return left.reason.kind === 'top' ? -1 : 1
    }
    if (left.reason.kind === 'top' && right.reason.kind === 'top') {
      if (left.reason.rank !== right.reason.rank) {
        return left.reason.rank - right.reason.rank
      }
    }
    return left.soonestIndex - right.soonestIndex
  })

  const top = scored.slice(0, limit)

  // The cheapest tier, not events.ticketPriceMin — that scalar holds whatever
  // price was written last and made taste picks disagree with the event page
  // (#1365). Resolved after the slice so we only aggregate the picks we return.
  const priceByTierByEventId = await loadPriceByTierByEventId(
    top.map((entry) => entry.row.id),
  )

  return top.map(({ row, reason }) => ({
    eventId: row.id,
    artist: row.artist,
    title: row.title,
    imageUrl: row.imageUrl,
    date: row.date,
    showTime: row.showTime,
    ticketPriceMin: resolveDisplayPrice(
      priceByTierByEventId.get(row.id) ?? [],
      row.ticketPriceMin,
    ),
    venueName: row.venueName,
    venueSlug: row.venueSlug,
    reason,
  }))
}
