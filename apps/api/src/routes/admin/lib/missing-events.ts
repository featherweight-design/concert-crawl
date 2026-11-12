import { and, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { db, events, venues } from '@concert-crawl/db';
import { isSoldOutSql } from '../../../lib/sold-out.js';
import { classifyMissing } from './classify-missing.js';
import { movedCandidateExpr, parseMovedCandidate } from './moved-candidate.js';

// Missing branch needs three per-row signals computed over the FULL venue
// data (not the current page): whether a live sibling still covers this show,
// the venue's crawl "event horizon", and how many missing rows cluster at the
// venue. Correlated subqueries reference the outer `events` row.
export const missingEventsSelect = (today: string) =>
  db
    .select({
      id: events.id,
      title: events.title,
      artist: events.artist,
      date: events.date,
      doorsTime: events.doorsTime,
      showTime: events.showTime,
      ticketPriceMin: events.ticketPriceMin,
      ticketPriceMax: events.ticketPriceMax,
      confidenceScore: sql<number | null>`(${events.confidenceScore})::float`,
      verified: events.verified,
      hiddenFromConsumer: events.hiddenFromConsumer,
      isConcertReviewNeeded: events.isConcertReviewNeeded,
      status: events.status,
      extractionStrategy: events.extractionStrategy,
      sourceUrl: events.sourceUrl,
      // The missing list links out to the venue so an admin can confirm a
      // disappearance without hand-searching. eventUrl is the show's own
      // page — a 404 or a cancellation notice settles it in one click —
      // and sourceUrl is the calendar fallback when we never got one.
      eventUrl: events.eventUrl,
      genre: events.genre,
      createdAt: events.createdAt,
      lastSeenAt: events.lastSeenAt,
      firstMissingAt: events.firstMissingAt,
      venueId: events.venueId,
      venueName: venues.name,
      isSoldOut: isSoldOutSql(),
      // Live sibling: same show still crawled under another row (headliner
      // containment — mirrors scripts/2026-07-19-missing-event-orphan-cleanup.sql).
      hasLiveSibling: sql<boolean>`EXISTS (
      SELECT 1 FROM events sib
      WHERE sib.venue_id = ${events.venueId}
        AND sib.date = ${events.date}
        AND sib.status = 'upcoming'
        AND sib.first_missing_at IS NULL
        AND sib.hidden_from_consumer = false
        AND sib.id <> ${events.id}
        AND ${events.canonicalArtist} <> '' AND sib.canonical_artist <> ''
        AND ${events.canonicalTitle} <> '' AND sib.canonical_title <> ''
        AND ( strpos(sib.canonical_title, ${events.canonicalArtist}) > 0
           OR strpos(${events.canonicalTitle}, sib.canonical_artist) > 0 )
    )`,
      // Event horizon: furthest date the crawl currently reaches at this venue.
      venueHorizon: sql<string | null>`(
      SELECT MAX(h.date) FROM events h
      WHERE h.venue_id = ${events.venueId}
        AND h.status = 'upcoming'
        AND h.first_missing_at IS NULL
        AND h.hidden_from_consumer = false
        AND h.date >= ${today}
    )`,
      // Cluster size: admin-visible missing rows at this venue (matches the
      // population `missingEventsWhere` selects: keep the two in step).
      clusterCount: sql<number>`(
      SELECT COUNT(*)::int FROM events c
      WHERE c.venue_id = ${events.venueId}
        AND c.first_missing_at IS NOT NULL
        AND c.status = 'upcoming'
        AND c.date >= ${today}
        AND c.hidden_from_consumer = false
    )`,
      // Relocation suggestion: a newly-created row that looks like this
      // same show on another night, or in another room. Read-only — the
      // admin confirms it, nothing here applies it.
      movedCandidate: movedCandidateExpr(today),
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id));

// Strip the internal classification signals from the API response and
// expose only `classification` (derived) + `clusterCount` (kept).
export const withMissingClassification = <
  TRow extends {
    date: string;
    venueHorizon: string | null;
    hasLiveSibling: boolean;
    movedCandidate: unknown;
  },
>(
  rows: TRow[],
) =>
  rows.map(({ venueHorizon, hasLiveSibling, movedCandidate, ...row }) => {
    const moved = parseMovedCandidate(movedCandidate);
    return {
      ...row,
      classification: classifyMissing({
        date: row.date,
        venueHorizon,
        hasLiveSibling,
        movedCandidateId: moved?.id ?? null,
      }),
      // The whole suggestion, or null. Nested rather than flattened so
      // the confirm step can name the show it is about to merge onto
      // without a second request per row.
      movedCandidate: moved,
    };
  });

// The missing population: admin-visible upcoming rows the crawler stopped
// returning. Excludes admin-hidden events (#712) so the list, the review pill
// and the Needs you queue stay in lock-step.
export const missingEventsWhere = (today: string) =>
  and(
    isNotNull(events.firstMissingAt),
    eq(events.status, 'upcoming'),
    gte(events.date, today),
    eq(events.hiddenFromConsumer, false),
  );
