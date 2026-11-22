// apps/api/src/lib/spotify-matches.ts
//
// Denver-match taste picks for a user's Spotify-sourced artist set (#763,
// eng spec §9.1), read by the weekly digest. Matching is canonical-name based:
//   events.canonical_artist = ANY($names)
//     OR events.canonical_headliners && $names
//     OR events.canonical_supporting && $names
// scoped to consumer-visible upcoming events (same visibility filter as the
// events list: upcoming status, date >= today MT, not hidden, not missing).
import {
  type SQL,
  and,
  asc,
  eq,
  exists,
  gte,
  inArray,
  isNull,
  sql,
} from 'drizzle-orm';
import {
  artists,
  db,
  events,
  userArtistFollows,
  venues,
} from '@concert-crawl/db';
import type {
  SpotifyTastePick,
  SpotifyTastePickReason,
} from '@concert-crawl/types';
import {
  billedCanonicalNames,
  billsAnyCanonicalName,
  displayHeadliner,
  portraitCanonicalName,
} from './event-billing.js';
import {
  loadPriceByTierByEventId,
  resolveDisplayPrice,
} from './price-aggregation/index.js';
import { SPOTIFY_FOLLOW_SOURCES } from './spotify-sync.js';
import { todayInDenver } from './time.js';

interface FollowName {
  artistName: string;
  canonicalName: string;
  source: (typeof userArtistFollows.$inferSelect)['source'];
  rank: number | null;
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
  );
};

// Shared §9.1 condition: consumer-visible upcoming events whose bill names one
// of the canonical set, per `billsAnyCanonicalName` (lib/event-billing.ts).
const matchedUpcomingCondition = (canonicalNames: string[]): SQL => {
  // Total: inArray/arrayOverlaps with [] would generate invalid SQL.
  if (canonicalNames.length === 0) return sql`false`;
  return (
    and(
      eq(events.status, 'upcoming'),
      gte(events.date, todayInDenver()),
      eq(events.hiddenFromConsumer, false),
      isNull(events.firstMissingAt),
      // A deactivated venue's shows must not drive fan-out or recommendations
      // (#1406). Correlated EXISTS rather than a join.
      exists(
        db
          .select({ one: sql`1` })
          .from(venues)
          .where(and(eq(venues.id, events.venueId), eq(venues.active, true))),
      ),
      billsAnyCanonicalName(canonicalNames),
    ) ?? sql`false`
  );
};

// True when `candidate` is a strictly stronger reason than `current` under
// the §9.4 ordering: any top-artist match beats a followed match, and a
// lower rank beats a higher one (rank 1 strongest). Ties keep `current`
// (first-wins), which is deterministic because callers iterate follows in
// the loadSpotifyFollowNames order and event artists headliner-first.
const isStrongerReason = (
  candidate: SpotifyTastePickReason,
  current: SpotifyTastePickReason | null,
): boolean => {
  if (current === null) return true;
  if (candidate.kind === 'top' && current.kind === 'top') {
    return candidate.rank < current.rank;
  }
  return candidate.kind === 'top' && current.kind === 'followed';
};

// Discovery shelf picks (#763 PR 8, eng spec §9.4): the viewer's matched
// upcoming events ranked deterministically — top-artist rank ascending
// first, then followed-only matches, soonest event date as the tiebreaker
// (with show time + id breaking exact date ties so the order is total).
// Each pick carries the strongest reason it matched, for the reason chips.
export async function getTastePicks(
  userId: string,
  limit: number,
): Promise<SpotifyTastePick[]> {
  const follows = await loadSpotifyFollowNames(userId);
  if (follows.length === 0) return [];

  // Strongest reason per canonical name: a spotify_top row (with rank)
  // beats a spotify_followed row for the same artist; among top rows the
  // smallest rank wins.
  const reasonByCanonical = new Map<string, SpotifyTastePickReason>();
  for (const follow of follows) {
    const candidate: SpotifyTastePickReason =
      follow.source === 'spotify_top' && follow.rank !== null
        ? { kind: 'top', rank: follow.rank, artistName: follow.artistName }
        : { kind: 'followed', artistName: follow.artistName };
    if (
      isStrongerReason(
        candidate,
        reasonByCanonical.get(follow.canonicalName) ?? null,
      )
    ) {
      reasonByCanonical.set(follow.canonicalName, candidate);
    }
  }

  // Date/time/id ORDER BY gives every row a deterministic "soonest" index;
  // the in-memory sort below only reorders by reason strength, so equal
  // reasons keep this soonest-first order (the §9.4 tiebreaker).
  const rows = await db
    .select({
      id: events.id,
      artist: displayHeadliner(),
      title: events.title,
      imageUrl: events.imageUrl,
      date: events.date,
      showTime: events.showTime,
      ticketPriceMin: events.ticketPriceMin,
      canonicalArtist: events.canonicalArtist,
      canonicalHeadliners: events.canonicalHeadliners,
      canonicalSupporting: events.canonicalSupporting,
      artistPhotoUrl: artists.photoUrl,
      venueName: venues.name,
      venueSlug: venues.slug,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    // Headliner only (Spec A §3.1). canonical_name is uniquely indexed, so
    // this cannot multiply picks.
    .leftJoin(artists, eq(portraitCanonicalName(), artists.canonicalName))
    .where(matchedUpcomingCondition([...reasonByCanonical.keys()]))
    .orderBy(asc(events.date), asc(events.showTime), asc(events.id));

  const scored: Array<{
    row: (typeof rows)[number];
    reason: SpotifyTastePickReason;
    soonestIndex: number;
  }> = [];
  for (const [index, row] of rows.entries()) {
    // Headliner first, then co-headliners, then supporting in stored order —
    // with first-wins ties in isStrongerReason this is deterministic per
    // event. Co-headliners must be here or a row matched solely by that arm
    // would find no reason and be dropped by the `continue` below.
    let reason: SpotifyTastePickReason | null = null;
    for (const canonical of billedCanonicalNames(row)) {
      const candidate = reasonByCanonical.get(canonical);
      if (candidate && isStrongerReason(candidate, reason)) {
        reason = candidate;
      }
    }
    if (reason === null) continue; // defensive — the WHERE guarantees a match
    scored.push({ row, reason, soonestIndex: index });
  }

  scored.sort((left, right) => {
    if (left.reason.kind !== right.reason.kind) {
      return left.reason.kind === 'top' ? -1 : 1;
    }
    if (left.reason.kind === 'top' && right.reason.kind === 'top') {
      if (left.reason.rank !== right.reason.rank) {
        return left.reason.rank - right.reason.rank;
      }
    }
    return left.soonestIndex - right.soonestIndex;
  });

  const top = scored.slice(0, limit);

  // The cheapest tier, not events.ticketPriceMin — that scalar holds whatever
  // price was written last and made taste picks disagree with the event page
  // (#1365). Resolved after the slice so we only aggregate the picks we return.
  const priceByTierByEventId = await loadPriceByTierByEventId(
    top.map((entry) => entry.row.id),
  );

  return top.map(({ row, reason }) => ({
    eventId: row.id,
    artist: row.artist,
    title: row.title,
    imageUrl: row.imageUrl,
    artistPhotoUrl: row.artistPhotoUrl,
    date: row.date,
    showTime: row.showTime,
    ticketPriceMin: resolveDisplayPrice(
      priceByTierByEventId.get(row.id) ?? [],
      row.ticketPriceMin,
    ),
    venueName: row.venueName,
    venueSlug: row.venueSlug,
    reason,
  }));
}
