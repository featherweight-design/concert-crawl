// apps/api/src/lib/spotify-matches.ts
//
// Denver-match summary for a user's Spotify-sourced artist set (#763 PR 5,
// eng spec §9.1). Matching is canonical-name based — exactly the rule the
// taste surfaces use:
//   events.canonical_artist = ANY($names) OR events.canonical_supporting && $names
// scoped to consumer-visible upcoming events (same visibility filter as the
// events list: upcoming status, date >= today MT, not hidden, not missing).
import {
  and,
  arrayOverlaps,
  asc,
  eq,
  gte,
  inArray,
  isNull,
  or,
} from 'drizzle-orm'
import { db, events, userArtistFollows } from '@concert-crawl/db'
import { SPOTIFY_FOLLOW_SOURCES } from './spotify-sync.js'
import { todayInTimezone } from './time.js'

// events.date holds event-local (Mountain Time) calendar dates — see the
// events route for the same reasoning.
const MT_TIME_ZONE = 'America/Denver'

// Chip cap for the connect-success "WE RECOGNIZED" row; the UI renders
// "+N more" from artistCount, so the payload never needs the full set.
const MATCHED_ARTIST_CAP = 12

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
}

const loadSpotifyFollowNames = async (
  userId: string,
): Promise<FollowName[]> => {
  return (
    db
      .select({
        artistName: userArtistFollows.artistName,
        canonicalName: userArtistFollows.canonicalName,
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
  canonicalSupporting: string[] | null
}

const loadMatchedUpcomingEvents = async (
  canonicalNames: string[],
): Promise<MatchedEventRow[]> => {
  if (canonicalNames.length === 0) return []
  return db
    .select({
      id: events.id,
      canonicalArtist: events.canonicalArtist,
      canonicalSupporting: events.canonicalSupporting,
    })
    .from(events)
    .where(
      and(
        eq(events.status, 'upcoming'),
        gte(events.date, todayInTimezone(MT_TIME_ZONE)),
        eq(events.hiddenFromConsumer, false),
        isNull(events.firstMissingAt),
        or(
          inArray(events.canonicalArtist, canonicalNames),
          // Array-overlap (&&) half of the §9.1 match rule.
          arrayOverlaps(events.canonicalSupporting, canonicalNames),
        ),
      ),
    )
}

// Full summary for the connection payload: how many of the user's artists
// have an upcoming Denver show, how many shows that is, and (capped) display
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
    for (const supporting of event.canonicalSupporting ?? []) {
      if (followSet.has(supporting)) matchedCanonicals.add(supporting)
    }
  }

  // Sorted before the cap so the chip list is deterministic — the event
  // query has no ORDER BY, and Set iteration would leak that row order.
  const matchedArtists = [...matchedCanonicals]
    .flatMap((canonical) => displayByCanonical.get(canonical) ?? [])
    .sort((left, right) => left.localeCompare(right))
    .slice(0, MATCHED_ARTIST_CAP)

  return {
    denverArtistCount: matchedCanonicals.size,
    denverShowCount: matchedEvents.length,
    matchedArtists,
  }
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
