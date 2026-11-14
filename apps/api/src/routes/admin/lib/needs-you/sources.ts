// One adapter per Needs you kind. Each reads the same population as the admin
// surface it replaces and returns display-ready items; none of them mutates.
// Ranking and snooze filtering happen in index.ts, not here.

import { createHash } from 'node:crypto';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  artistReports,
  artists,
  crawlRunPages,
  crawlRuns,
  db,
  events,
  feedback,
  priceSubmissions,
  userEvents,
  userProfiles,
  venues,
  type SpotifyCandidateSnapshot,
} from '@concert-crawl/db';
import { AUTO_APPROVE_THRESHOLD } from '@concert-crawl/crawler-core';
import { canonicalizeArtist } from '@concert-crawl/types';
import type {
  NeedsYouAnswerOption,
  NeedsYouArtistCandidate,
  NeedsYouEvidenceLine,
  NeedsYouItem,
  NeedsYouKind,
  NeedsYouRobotsResult,
} from '@concert-crawl/types';
import {
  hasUpcomingShowExpr,
  nextShowDateExpr,
  nextShowVenueExpr,
} from '../../../../lib/artist-upcoming.js';
import {
  EXHAUSTIBLE_STATUSES,
  isNotExhaustedExpr,
} from '../../../../lib/artist-exhaustion.js';
import {
  missingEventsSelect,
  missingEventsWhere,
  withMissingClassification,
} from '../missing-events.js';
import { TRIAGE_HISTORY_RUN_COUNT, deriveFaults } from '../triage.js';
import { parseRunRows } from '../../triage.js';
import { addDays, denverDate } from './keys.js';
import {
  loadPriceByTierByEventId,
  lowestHeadline,
} from '../../../../lib/price-aggregation/index.js';

// How far out an artist's next show may be for the artist to be worth a human's
// time, and the price-batch window. Both are product calls from the brief.
export const ARTIST_HORIZON_DAYS = 60;
export const PRICE_BATCH_MIN_DAYS = 2;
export const PRICE_BATCH_MAX_DAYS = 30;
export const PRICE_BATCH_MIN_CORROBORATIONS = 2;

export interface SourceContext {
  now: Date;
}

type Adapter = (ctx: SourceContext) => Promise<NeedsYouItem[]>;

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

const answer = (
  slug: string,
  label: string,
  flags: Partial<Omit<NeedsYouAnswerOption, 'slug' | 'label'>> = {},
): NeedsYouAnswerOption => ({
  slug,
  label,
  notifiesFans: false,
  undoable: false,
  suggested: false,
  ...flags,
});

const line = (
  label: string,
  value: string | number | null | undefined,
): NeedsYouEvidenceLine[] =>
  value === null || value === undefined || value === ''
    ? []
    : [{ label, value: String(value) }];

// ---------------------------------------------------------------------------
// Watchers
// ---------------------------------------------------------------------------

// Bind parameters per query stay far below Postgres's 65,535 limit however many
// events a bad crawl leaves unverified.
const WATCHER_CHUNK = 1000;

/** Watching rows per event. Events nobody watches are absent. */
export const watcherCounts = async (
  eventIds: string[],
): Promise<Map<string, number>> => {
  const counts = new Map<string, number>();
  for (let start = 0; start < eventIds.length; start += WATCHER_CHUNK) {
    const rows = await db
      .select({
        eventId: userEvents.eventId,
        total: sql<number>`count(*)::int`,
      })
      .from(userEvents)
      .where(
        and(
          inArray(
            userEvents.eventId,
            eventIds.slice(start, start + WATCHER_CHUNK),
          ),
          eq(userEvents.status, 'watching'),
        ),
      )
      .groupBy(userEvents.eventId);
    for (const row of rows) counts.set(row.eventId, row.total);
  }
  return counts;
};

// ---------------------------------------------------------------------------
// Missing shows: show-dropped and show-moved
// ---------------------------------------------------------------------------

const missingItems: Adapter = async ({ now }) => {
  const today = denverDate(now);
  const rows = withMissingClassification(
    await missingEventsSelect(today)
      .where(missingEventsWhere(today))
      .orderBy(asc(events.date)),
  );
  const watchers = await watcherCounts(rows.map((row) => row.id));
  const crawledFine = await otherShowsCrawledFineByVenue(
    [
      ...new Set(
        rows.flatMap((row) => (row.venueId === null ? [] : [row.venueId])),
      ),
    ],
    today,
  );

  return rows.map((row): NeedsYouItem => {
    const common = {
      title: row.title,
      venueId: row.venueId,
      venueName: row.venueName,
      fanDate: row.date,
      showTime: row.showTime,
      watchers: watchers.get(row.id) ?? 0,
    };
    const evidence = [
      ...line('Show date', row.date),
      ...line('Last seen', row.lastSeenAt?.toISOString().slice(0, 10)),
      ...line('Missing since', row.firstMissingAt?.toISOString().slice(0, 10)),
      ...line('Missing at this venue', row.clusterCount),
    ];
    const since = row.firstMissingAt?.getTime() ?? 0;

    // A live sibling (duplicate) outranks a moved candidate, as in
    // classifyMissing, so only a row classified `moved` becomes show-moved.
    if (row.classification === 'moved' && row.movedCandidate) {
      const target = row.movedCandidate;
      return {
        ...common,
        key: `show-moved:${row.id}:${target.id}`,
        kind: 'show-moved',
        eventId: row.id,
        moveTo: {
          eventId: target.id,
          title: target.title,
          venueName: target.venueName,
        },
        evidence: [
          ...evidence,
          ...line('Looks like', `${target.title} on ${target.date}`),
          ...line('At', target.venueName),
        ],
        answers: [
          answer('move_to', `Move to ${target.venueName ?? target.title}`, {
            notifiesFans: true,
            suggested: true,
          }),
          answer('cancelled', 'Cancelled', { notifiesFans: true }),
          answer('still_on', 'Still on', { undoable: true }),
        ],
      };
    }

    return {
      ...common,
      key: `show-dropped:${row.id}:${since}`,
      kind: 'show-dropped',
      eventId: row.id,
      classification: row.classification,
      lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
      otherShowsCrawledFine:
        row.venueId === null ? null : (crawledFine.get(row.venueId) ?? null),
      evidence: [...evidence, ...line('Looks like', row.classification)],
      answers: [
        answer('still_on', 'Still on', {
          undoable: true,
          suggested: row.classification === 'crawl_gap',
        }),
        answer('postponed', 'Postponed', { notifiesFans: true }),
        answer('cancelled', 'Cancelled', { notifiesFans: true }),
        answer('moved', 'Moved', { notifiesFans: true }),
      ],
    };
  });
};

// ---------------------------------------------------------------------------
// Venues: failing and blocked
// ---------------------------------------------------------------------------

// How many runs per venue the okStreakBefore scan reads, so the streak tops
// out at this number.
export const OK_STREAK_SCAN_RUNS = 100;

/**
 * Per failing venue: OK readings in a row immediately before the current
 * failure streak. As in triage (`isReading`, `findSubjectIndex`), skipped runs
 * carry no reading and are ignored, and an OK reading is a `success` or
 * `partial` run. One windowed query for all venues. A venue whose last 100
 * runs are all failures maps to 0.
 */
const okStreakBeforeFailure = async (
  venueIds: string[],
): Promise<Map<string, number>> => {
  const result = new Map<string, number>();
  if (venueIds.length === 0) return result;
  const ranked = db
    .select({
      venueId: crawlRuns.venueId,
      status: crawlRuns.status,
      createdAt: crawlRuns.createdAt,
      rn: sql<number>`row_number() over (partition by ${crawlRuns.venueId} order by ${crawlRuns.createdAt} desc, ${crawlRuns.id} desc)`.as(
        'rn',
      ),
    })
    .from(crawlRuns)
    .where(inArray(crawlRuns.venueId, venueIds))
    .as('ranked');
  const rows = await db
    .select({ venueId: ranked.venueId, status: ranked.status })
    .from(ranked)
    .where(lte(ranked.rn, OK_STREAK_SCAN_RUNS))
    .orderBy(asc(ranked.venueId), asc(ranked.rn));
  // rn is unique per venue (the window orders by created_at then id), so the
  // row order above is deterministic.

  // Rows are newest first per venue. Each venue starts in the failure streak,
  // moves to counting OK readings at its first non-failed reading, and is done
  // at the next reading that is not OK.
  const phase = new Map<string, 'failing' | 'counting' | 'done'>();
  for (const id of venueIds) result.set(id, 0);
  for (const row of rows) {
    if (row.status === 'skipped') continue;
    const current = phase.get(row.venueId) ?? 'failing';
    if (current === 'done') continue;
    if (current === 'failing' && row.status === 'failed') continue;
    if (row.status === 'success' || row.status === 'partial') {
      phase.set(row.venueId, 'counting');
      result.set(row.venueId, (result.get(row.venueId) ?? 0) + 1);
    } else {
      phase.set(row.venueId, 'done');
    }
  }
  return result;
};

/**
 * Per run id: pages fetched (crawl_run_pages rows; absent when none were
 * recorded) and the run's robots.txt result (crawl_runs.robots_txt_blocked).
 */
const ROBOTS_RESULTS: readonly NeedsYouRobotsResult[] = [
  'yes',
  'no',
  'unchecked',
];
const toRobotsResult = (value: string | null): NeedsYouRobotsResult | null =>
  ROBOTS_RESULTS.find((known) => known === value) ?? null;

const blockedRunDetails = async (
  runIds: string[],
): Promise<
  Map<string, { pages: number | null; robots: NeedsYouRobotsResult | null }>
> => {
  const result = new Map<
    string,
    { pages: number | null; robots: NeedsYouRobotsResult | null }
  >();
  if (runIds.length === 0) return result;
  const [runRows, pageRows] = await Promise.all([
    db
      .select({ id: crawlRuns.id, robots: crawlRuns.robotsTxtBlocked })
      .from(crawlRuns)
      .where(inArray(crawlRuns.id, runIds)),
    db
      .select({
        runId: crawlRunPages.crawlRunId,
        total: sql<number>`count(*)::int`,
      })
      .from(crawlRunPages)
      .where(inArray(crawlRunPages.crawlRunId, runIds))
      .groupBy(crawlRunPages.crawlRunId),
  ]);
  const pages = new Map(pageRows.map((row) => [row.runId, row.total] as const));
  for (const row of runRows) {
    result.set(row.id, {
      pages: pages.get(row.id) ?? null,
      robots: toRobotsResult(row.robots),
    });
  }
  return result;
};

/**
 * Per venue: other upcoming shows the venue's latest successful run still saw.
 * Run start is not stored, so it is approximated as created_at minus
 * duration_ms (a run row is written when the run ends; last_seen_at is bumped
 * during it). A venue with no successful run, or whose latest one has no
 * duration_ms, is absent (the caller reads that as null, never a guessed 0).
 */
const otherShowsCrawledFineByVenue = async (
  venueIds: string[],
  today: string,
): Promise<Map<string, number>> => {
  const result = new Map<string, number>();
  if (venueIds.length === 0) return result;
  const latest = db
    .selectDistinctOn([crawlRuns.venueId], {
      venueId: crawlRuns.venueId,
      runStart: sql<
        string | null
      >`(${crawlRuns.createdAt} - ${crawlRuns.durationMs} * interval '1 millisecond')`.as(
        'run_start',
      ),
    })
    .from(crawlRuns)
    .where(
      and(
        inArray(crawlRuns.venueId, venueIds),
        eq(crawlRuns.status, 'success'),
      ),
    )
    .orderBy(
      asc(crawlRuns.venueId),
      desc(crawlRuns.createdAt),
      desc(crawlRuns.id),
    )
    .as('latest');
  const rows = await db
    .select({
      venueId: latest.venueId,
      total: sql<number>`count(${events.id})::int`,
    })
    .from(latest)
    .leftJoin(
      events,
      and(
        eq(events.venueId, latest.venueId),
        eq(events.status, 'upcoming'),
        gte(events.date, today),
        isNull(events.firstMissingAt),
        eq(events.hiddenFromConsumer, false),
        gte(events.lastSeenAt, sql`${latest.runStart}`),
      ),
    )
    .where(isNotNull(latest.runStart))
    .groupBy(latest.venueId);
  for (const row of rows) result.set(row.venueId, row.total);
  return result;
};

const venueFaultItems: Adapter = async ({ now }) => {
  const today = denverDate(now);

  const [venueRows, rawRuns, nextShows] = await Promise.all([
    db
      .select({
        id: venues.id,
        name: venues.name,
        blockedAt: venues.blockedAt,
        consecutiveFailures: venues.consecutiveFailures,
        lastUrlCoverageAlertAt: venues.lastUrlCoverageAlertAt,
        lastUrlCoverageOkAt: venues.lastUrlCoverageOkAt,
        active: venues.active,
        crawlPausedAt: venues.crawlPausedAt,
      })
      .from(venues)
      // A removed venue is never crawled again, so a fault on it is nothing
      // to answer, and its re-crawl answer could only be refused. The venue
      // list leaves it out the same way.
      .where(and(eq(venues.verified, true), isNull(venues.removedAt))),
    db.execute(sql`
      SELECT id, venue_id, status, reason, http_status_code, error_message,
             events_found, events_usable, events_inserted, events_updated,
             furthest_event_date, created_at
      FROM (
        SELECT cr.id, cr.venue_id, cr.status, cr.reason, cr.http_status_code,
               cr.error_message, cr.events_found, cr.events_usable,
               cr.events_inserted, cr.events_updated, cr.furthest_event_date,
               cr.created_at,
               row_number() OVER (
                 PARTITION BY cr.venue_id ORDER BY cr.created_at DESC
               ) AS rn
        FROM ${crawlRuns} cr
        JOIN ${venues} vn ON vn.id = cr.venue_id AND vn.verified = true
          AND vn.removed_at IS NULL
      ) ranked
      WHERE rn <= ${TRIAGE_HISTORY_RUN_COUNT}
    `),
    db
      .select({
        venueId: events.venueId,
        soonest: sql<string>`min(${events.date})`,
        total: sql<number>`count(*)::int`,
      })
      .from(events)
      .where(
        and(
          eq(events.status, 'upcoming'),
          gte(events.date, today),
          isNull(events.firstMissingAt),
          eq(events.hiddenFromConsumer, false),
        ),
      )
      .groupBy(events.venueId),
  ]);

  const runs = parseRunRows(rawRuns);
  // Only the two hard-band conditions this queue carries. Coverage is not
  // read, so an empty list is the honest input for it.
  const faults = deriveFaults({ venues: venueRows, runs, coverage: [], now });

  const soonestByVenue = new Map(
    nextShows.flatMap((row) =>
      row.venueId === null ? [] : [[row.venueId, row.soonest] as const],
    ),
  );

  const showCountByVenue = new Map(
    nextShows.flatMap((row) =>
      row.venueId === null ? [] : [[row.venueId, row.total] as const],
    ),
  );
  const venueById = new Map(venueRows.map((row) => [row.id, row] as const));

  const hardFaults = faults.filter(
    (fault) => fault.condition === 'failed' || fault.condition === 'blocked',
  );
  // Both kinds read the OK streak: "Before this: 62 OK runs in a row" is drawn
  // on the blocked panel, the failing one carries it too.
  const faultVenueIds = hardFaults.map((fault) => fault.venueId);
  const blockedRunIds = hardFaults.flatMap((fault) =>
    fault.condition === 'blocked' && fault.crawlRunId !== null
      ? [fault.crawlRunId]
      : [],
  );
  const [okStreaks, blockedRunExtras] = await Promise.all([
    okStreakBeforeFailure(faultVenueIds),
    blockedRunDetails(blockedRunIds),
  ]);

  const items: NeedsYouItem[] = [];
  for (const fault of faults) {
    if (fault.condition !== 'failed' && fault.condition !== 'blocked') continue;
    const venueRow = venueById.get(fault.venueId);
    const lastRuns = runs
      .filter((run) => run.venueId === fault.venueId)
      .sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      )
      .slice(0, 5)
      .map((run) => ({
        at: run.createdAt.toISOString(),
        status: run.status,
        reason: run.reason ?? null,
        errorMessage: run.errorMessage,
        eventsFound: run.eventsFound,
        httpStatus: run.httpStatusCode,
      }));
    // The key is the venue and the kind of fault, with no timestamp. The
    // "since" of a streak is read from a 30-run window and slides forward as
    // old runs fall out of it, which would make a snoozed fault reappear.
    const common = {
      venueId: fault.venueId,
      venueName: fault.venue,
      fanDate: soonestByVenue.get(fault.venueId) ?? null,
      watchers: 0,
      lastRuns,
      venueLive: venueRow?.active ?? false,
      pausedAt: venueRow?.crawlPausedAt?.toISOString() ?? null,
      showCount: showCountByVenue.get(fault.venueId) ?? 0,
    };

    if (fault.condition === 'failed') {
      items.push({
        ...common,
        key: `venue-failing:${fault.venueId}`,
        kind: 'venue-failing',
        title: `${fault.venue} crawl is failing`,
        cause: fault.evidence.errorClass,
        okStreakBefore: okStreaks.get(fault.venueId) ?? null,
        evidence: [
          ...line('Consecutive failures', fault.evidence.failures),
          ...line('Failing for', fault.dur),
          ...line('Error', fault.evidence.errorClass),
        ],
        answers: [
          answer('re_crawl_now', 'Re-crawl now'),
          // The "..." says it opens the Pause panel first (A3 2c #16).
          answer('keep_paused', 'Keep paused...'),
        ],
      });
    } else {
      items.push({
        ...common,
        key: `venue-blocked:${fault.venueId}`,
        kind: 'venue-blocked',
        title: `${fault.venue} is blocking the crawler`,
        cause:
          fault.evidence.status === null
            ? null
            : `HTTP ${fault.evidence.status}`,
        okStreakBefore: okStreaks.get(fault.venueId) ?? null,
        pagesThisRun:
          fault.crawlRunId === null
            ? null
            : (blockedRunExtras.get(fault.crawlRunId)?.pages ?? null),
        robots:
          fault.crawlRunId === null
            ? null
            : (blockedRunExtras.get(fault.crawlRunId)?.robots ?? null),
        evidence: [
          ...line('Blocked for', fault.dur),
          ...line('HTTP status', fault.evidence.status),
          ...line('Refusals', fault.evidence.refusals),
          ...line('Last success', fault.evidence.lastSuccess),
        ],
        answers: [
          answer('re_crawl_once', 'Re-crawl once'),
          answer('pause_crawling', 'Pause crawling...'),
        ],
      });
    }
  }
  return items;
};

// ---------------------------------------------------------------------------
// Artists
// ---------------------------------------------------------------------------

const MAX_CANDIDATES = 5;

/** The reasons on each artist's open reports, in one query. */
const openReportReasons = async (
  artistIds: string[],
): Promise<Map<string, string[]>> => {
  const reasons = new Map<string, string[]>();
  if (artistIds.length === 0) return reasons;
  const rows = await db
    .select({ artistId: artistReports.artistId, reason: artistReports.reason })
    .from(artistReports)
    .where(
      and(
        inArray(artistReports.artistId, artistIds),
        eq(artistReports.status, 'open'),
      ),
    );
  for (const row of rows) {
    const seen = reasons.get(row.artistId);
    if (!seen) reasons.set(row.artistId, [row.reason]);
    else if (!seen.includes(row.reason)) seen.push(row.reason);
  }
  return reasons;
};

/**
 * Which of these Spotify ids belong to an artist we have shows for (an event
 * under that artist's name), in one query: "Plays Denver" is our own events.
 */
const spotifyIdsWithShows = async (
  spotifyIds: string[],
): Promise<Set<string>> => {
  const unique = [...new Set(spotifyIds)];
  if (unique.length === 0) return new Set();
  const rows = await db
    .select({ spotifyArtistId: artists.spotifyArtistId })
    .from(artists)
    .where(
      and(
        inArray(artists.spotifyArtistId, unique),
        // Any show we list for them, past or coming: a fan-visible event under
        // the artist's own name (the headliner, as the lists key it).
        sql`exists (select 1 from ${events} where ${events.canonicalArtist} = ${artists.canonicalName} and ${events.hiddenFromConsumer} = false)`,
      ),
    );
  return new Set(
    rows.flatMap((row) => (row.spotifyArtistId ? [row.spotifyArtistId] : [])),
  );
};

/** The stored candidates, the artist's own name first, then the stored order. */
const artistCandidates = (
  row: {
    canonicalName: string;
    spotifyArtistId: string | null;
    candidates: SpotifyCandidateSnapshot[] | null;
  },
  withShows: Set<string>,
): NeedsYouArtistCandidate[] =>
  (row.candidates ?? [])
    .map((cand): NeedsYouArtistCandidate => ({
      id: cand.id,
      name: cand.name,
      imageUrl: cand.imageUrl,
      genres: cand.genres,
      spotifyUrl: cand.spotifyUrl,
      current: cand.id === row.spotifyArtistId,
      // The same normaliser that made the artist's canonical name, so a
      // name with a diacritic or an ampersand still counts as the same act.
      exact: canonicalizeArtist(cand.name) === row.canonicalName,
      playsDenver: withShows.has(cand.id),
    }))
    .sort((left, right) => Number(right.exact) - Number(left.exact))
    .slice(0, MAX_CANDIDATES);

const artistItems: Adapter = async () => {
  const openReports = sql<number>`(
    select count(*)::int from ${artistReports}
    where ${artistReports.artistId} = ${artists.id}
      and ${artistReports.status} = 'open'
  )`;

  const rows = await db
    .select({
      id: artists.id,
      name: artists.name,
      matchStatus: artists.matchStatus,
      // "Keep this match" confirms an unconfirmed auto-match or dismisses open
      // reports; with neither, the API refuses it (422), so it is not offered.
      // Mirrors `keepThisMatch` in answers-artists.ts: change them together.
      confirmable: sql<boolean>`(${artists.autoMatchedAt} is not null and ${artists.spotifyArtistId} is not null)`,
      reportCount: openReports,
      nextShow: nextShowDateExpr(ARTIST_HORIZON_DAYS),
      nextShowVenue: nextShowVenueExpr(ARTIST_HORIZON_DAYS),
      canonicalName: artists.canonicalName,
      spotifyArtistId: artists.spotifyArtistId,
      photoUrl: artists.photoUrl,
      candidates: artists.spotifyCandidates,
    })
    .from(artists)
    .where(
      and(
        eq(artists.hidden, false),
        hasUpcomingShowExpr(ARTIST_HORIZON_DAYS),
        sql`(
          (${inArray(artists.matchStatus, [...EXHAUSTIBLE_STATUSES])}
            and ${isNotExhaustedExpr()})
          or ${openReports} > 0
        )`,
      ),
    );

  const reasons = await openReportReasons(rows.map((row) => row.id));
  const denver = await spotifyIdsWithShows(
    rows.flatMap((row) => (row.candidates ?? []).map((cand) => cand.id)),
  );

  return rows.map((row): NeedsYouItem => ({
    key: `artist:${row.id}:${row.matchStatus}`,
    kind: 'artist',
    title: row.name,
    venueId: null,
    venueName: null,
    fanDate: row.nextShow,
    watchers: 0,
    artistId: row.id,
    matchStatus: row.matchStatus,
    reportCount: row.reportCount,
    nextShowVenue: row.nextShowVenue,
    spotifyArtistId: row.spotifyArtistId,
    photoUrl: row.photoUrl,
    reportReasons: reasons.get(row.id) ?? [],
    candidates: artistCandidates(row, denver),
    evidence: [
      ...line('Match status', row.matchStatus),
      ...line('Open reports', row.reportCount > 0 ? row.reportCount : null),
      ...line('Next show', row.nextShow),
    ],
    answers: [
      answer('pick_the_right_artist', 'Pick the right artist'),
      ...(row.confirmable || row.reportCount > 0
        ? [answer('keep_this_match', 'Keep this match', { undoable: true })]
        : []),
      answer('no_photo', 'No photo'),
    ],
  }));
};

// ---------------------------------------------------------------------------
// Low-confidence events
// ---------------------------------------------------------------------------

/** A numeric column (a string off the driver) as a number, null if it isn't one. */
const finiteOrNull = (value: string | number | null): number | null => {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const lowConfidenceItems: Adapter = async ({ now }) => {
  const today = denverDate(now);
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      date: events.date,
      showTime: events.showTime,
      venueId: events.venueId,
      venueName: venues.name,
      confidence: events.confidenceScore,
      strategy: events.extractionStrategy,
      artist: events.artist,
      description: events.description,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        eq(events.verified, false),
        // An event an admin ruled Not a concert is answered, not undecided.
        eq(events.hiddenFromConsumer, false),
        // A show the crawler stopped seeing is a show-dropped item already,
        // and a cancelled or postponed one has been decided: neither is also
        // a low-confidence question.
        eq(events.status, 'upcoming'),
        isNull(events.firstMissingAt),
        gte(events.date, today),
      ),
    );
  const ids = rows.map((row) => row.id);
  const watchers = await watcherCounts(ids);
  // The price is read through the shared tier loader, never from the event's
  // own price columns, so this panel and Browse agree on what is listed.
  const tiers = await loadPriceByTierByEventId(ids);
  const listedOf = (eventId: string) => {
    // The pipeline's own pick, so this panel and Browse cannot disagree.
    const headline = lowestHeadline(tiers.get(eventId) ?? []);
    return headline
      ? { priceMin: headline.priceMin, priceMax: headline.priceMax }
      : { priceMin: null, priceMax: null };
  };

  return rows.map((row): NeedsYouItem => ({
    key: `event-low-confidence:${row.id}`,
    kind: 'event-low-confidence',
    title: row.title,
    venueId: row.venueId,
    venueName: row.venueName,
    fanDate: row.date,
    showTime: row.showTime,
    watchers: watchers.get(row.id) ?? 0,
    eventId: row.id,
    artist: row.artist,
    ...listedOf(row.id),
    description: row.description,
    confidence: finiteOrNull(row.confidence),
    autoApproveBar: AUTO_APPROVE_THRESHOLD,
    evidence: [
      ...line('Show date', row.date),
      ...line('Confidence', row.confidence),
      ...line('Extracted by', row.strategy),
    ],
    answers: [
      answer('not_a_concert', 'Not a concert', { undoable: true }),
      answer('its_a_show', "It's a show", { undoable: true }),
      answer('edit_then_list', 'Edit, then list'),
    ],
  }));
};

// ---------------------------------------------------------------------------
// Price checks (contests) and the price batch
// ---------------------------------------------------------------------------

/**
 * How many prices each checking fan has submitted, and how many of those are
 * approved (corroborated or verified), in one grouped query.
 */
const checkerCounts = async (
  userIds: string[],
): Promise<Map<string, { all: number; approved: number }>> => {
  const counts = new Map<string, { all: number; approved: number }>();
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return counts;
  const rows = await db
    .select({
      userId: priceSubmissions.userId,
      all: sql<number>`count(*)::int`,
      approved: sql<number>`count(*) filter (where ${priceSubmissions.status} = 'corroborated')::int`,
    })
    .from(priceSubmissions)
    // Their track record: the prices they submitted, not the price checks
    // (which carry a disputed id), so the item in question is not counted.
    .where(
      and(
        inArray(priceSubmissions.userId, unique),
        isNull(priceSubmissions.disputedSubmissionId),
      ),
    )
    .groupBy(priceSubmissions.userId);
  for (const row of rows) {
    if (row.userId)
      counts.set(row.userId, { all: row.all, approved: row.approved });
  }
  return counts;
};

const priceCheckItems: Adapter = async ({ now }) => {
  const today = denverDate(now);
  const parent = alias(priceSubmissions, 'parent');
  const rows = await db
    .select({
      contestId: parent.id,
      counterId: priceSubmissions.id,
      eventId: parent.eventId,
      eventTitle: events.title,
      eventDate: events.date,
      venueId: venues.id,
      venueName: venues.name,
      listedMin: parent.priceMin,
      listedMax: parent.priceMax,
      checkedMin: priceSubmissions.priceMin,
      checkedMax: priceSubmissions.priceMax,
      tier: priceSubmissions.tier,
      listedAt: parent.createdAt,
      checkedAt: priceSubmissions.createdAt,
      checkedFans: priceSubmissions.corroborationCount,
      checkerId: priceSubmissions.userId,
      ticketUrl: events.ticketUrl,
      fans: parent.corroborationCount,
    })
    .from(priceSubmissions)
    .innerJoin(parent, eq(parent.id, priceSubmissions.disputedSubmissionId))
    .innerJoin(events, eq(events.id, parent.eventId))
    .innerJoin(venues, eq(venues.id, events.venueId))
    .where(
      and(
        eq(priceSubmissions.status, 'pending'),
        isNotNull(priceSubmissions.disputedSubmissionId),
        // A price check on a show that has happened, or one a fan cannot see,
        // decides nothing anybody reads, and a past one would rank first for
        // being the soonest date. The parent's own status is left to the
        // contest list this mirrors (routes/admin/contests.ts).
        eq(events.hiddenFromConsumer, false),
        gte(events.date, today),
      ),
    );
  const watchers = await watcherCounts(rows.map((row) => row.eventId));
  const checkers = await checkerCounts(
    rows.flatMap((row) => row.checkerId ?? []),
  );

  return rows.map((row): NeedsYouItem => ({
    key: `price-check:${row.contestId}:${row.counterId}`,
    kind: 'price-check',
    title: row.eventTitle,
    venueId: row.venueId,
    venueName: row.venueName,
    fanDate: row.eventDate,
    watchers: watchers.get(row.eventId) ?? 0,
    contestId: row.contestId,
    listedPrice: row.listedMin,
    checkedPrice: row.checkedMin,
    listedMax: row.listedMax,
    checkedMax: row.checkedMax,
    tier: row.tier,
    listedAt: row.listedAt.toISOString(),
    checkedAt: row.checkedAt.toISOString(),
    checkedFans: row.checkedFans,
    ticketUrl: row.ticketUrl,
    checkerSubmissions: checkers.get(row.checkerId ?? '')?.all ?? 0,
    checkerApproved: checkers.get(row.checkerId ?? '')?.approved ?? 0,
    evidence: [
      ...line('Show date', row.eventDate),
      ...line('Listed price', row.listedMin),
      ...line('Checked price', row.checkedMin),
      ...line('Fans backing the listed price', row.fans),
    ],
    answers: [
      answer('use_checked_price', 'Use checked price', { notifiesFans: true }),
      answer('keep_listed_price', 'Keep listed price', { notifiesFans: true }),
    ],
  }));
};

const priceBatchItems: Adapter = async ({ now }) => {
  const today = denverDate(now);
  const rows = await db
    .select({ id: priceSubmissions.id, date: events.date })
    .from(priceSubmissions)
    .innerJoin(events, eq(events.id, priceSubmissions.eventId))
    .where(
      and(
        eq(priceSubmissions.status, 'pending'),
        isNull(priceSubmissions.disputedSubmissionId),
        // Only shows a fan can see: approving a price on a hidden or called-off
        // show changes nothing anybody reads.
        eq(events.hiddenFromConsumer, false),
        eq(events.status, 'upcoming'),
        // A price held for the admin (the "approve prices myself" setting) is
        // always the admin's to decide; any other waits for its corroborations
        // and the product window.
        or(
          isNotNull(priceSubmissions.heldForAdminAt),
          and(
            gte(
              priceSubmissions.corroborationCount,
              PRICE_BATCH_MIN_CORROBORATIONS,
            ),
            gte(events.date, addDays(today, PRICE_BATCH_MIN_DAYS)),
            lte(events.date, addDays(today, PRICE_BATCH_MAX_DAYS)),
          ),
        ),
      ),
    )
    .orderBy(asc(events.date), asc(priceSubmissions.id));
  const [first] = rows;
  if (!first) return [];

  return [
    {
      // The key names the exact set of submissions, so a snooze covers the
      // batch the admin saw and a newly corroborated price is a new question.
      key: `price-batch:${createHash('sha256')
        .update(rows.map((row) => row.id).join(','))
        .digest('hex')
        .slice(0, 12)}`,
      kind: 'price-batch',
      title: `${rows.length} new ${rows.length === 1 ? 'price' : 'prices'}`,
      venueId: null,
      venueName: null,
      fanDate: first.date,
      watchers: 0,
      submissionIds: rows.map((row) => row.id),
      evidence: [
        ...line('Prices', rows.length),
        ...line('Soonest show', first.date),
        ...line('Corroborations each', `${PRICE_BATCH_MIN_CORROBORATIONS}+`),
      ],
      answers: [
        answer('approve_all', 'Approve all'),
        answer('review', 'Review'),
      ],
    },
  ];
};

// ---------------------------------------------------------------------------
// Bugs
// ---------------------------------------------------------------------------

const MAX_SCREENSHOT_CHARS = 200_000;
// Raster images only, as base64: never svg+xml (it can carry script) or text.
const SCREENSHOT_DATA_URI =
  /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/** The screenshot a reporter attached (`metadata.screenshot`), if it is usable. */
const screenshotOf = (metadata: unknown): string | null => {
  if (typeof metadata !== 'object' || metadata === null) return null;
  const shot = Reflect.get(metadata, 'screenshot');
  // Reporter-controlled: only an inline image under a size cap goes into the
  // queue (every unread bug rides in every list and count response), and never
  // a URL the admin's browser would be sent to fetch.
  return typeof shot === 'string' &&
    SCREENSHOT_DATA_URI.test(shot) &&
    shot.length <= MAX_SCREENSHOT_CHARS
    ? shot
    : null;
};

/** The device line a reporter's widget sent (`metadata.device`), cut to a safe length. */
const deviceOf = (metadata: unknown): string | null => {
  if (typeof metadata !== 'object' || metadata === null) return null;
  const device = Reflect.get(metadata, 'device');
  // By code point, so an emoji at the cut is never split into a lone surrogate.
  return typeof device === 'string' && device.trim() !== ''
    ? Array.from(device.trim()).slice(0, 120).join('')
    : null;
};

const bugItems: Adapter = async () => {
  const rows = await db
    .select({
      id: feedback.id,
      message: feedback.message,
      pageUrl: feedback.pageUrl,
      createdAt: feedback.createdAt,
      metadata: feedback.metadata,
      issueUrl: feedback.issueUrl,
      handle: userProfiles.handle,
    })
    .from(feedback)
    .leftJoin(userProfiles, eq(userProfiles.userId, feedback.userId))
    .where(and(eq(feedback.category, 'bug'), eq(feedback.status, 'unread')));

  return rows.map((row): NeedsYouItem => ({
    key: `bug:${row.id}`,
    kind: 'bug',
    title:
      row.message.length > 80 ? `${row.message.slice(0, 77)}...` : row.message,
    venueId: null,
    venueName: null,
    fanDate: null,
    watchers: 0,
    feedbackId: row.id,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    handle: row.handle,
    screenshot: screenshotOf(row.metadata),
    issueUrl: row.issueUrl,
    device: deviceOf(row.metadata),
    evidence: [
      ...line('Page', row.pageUrl),
      ...line('Reported', row.createdAt.toISOString().slice(0, 10)),
    ],
    answers: [answer('resolve', 'Resolve')],
  }));
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

// show-dropped and show-moved share one query, and so do the two venue kinds,
// so adapters are keyed by the group of kinds they produce. Each runs once per
// request no matter how many of its kinds are wanted.
const GROUPS: { kinds: NeedsYouKind[]; adapter: Adapter }[] = [
  { kinds: ['show-dropped', 'show-moved'], adapter: missingItems },
  { kinds: ['venue-failing', 'venue-blocked'], adapter: venueFaultItems },
  { kinds: ['artist'], adapter: artistItems },
  { kinds: ['event-low-confidence'], adapter: lowConfidenceItems },
  { kinds: ['price-check'], adapter: priceCheckItems },
  { kinds: ['price-batch'], adapter: priceBatchItems },
  { kinds: ['bug'], adapter: bugItems },
];

/** Every current item, or only those of `kind`, in no particular order. */
export const loadNeedsYouItems = async (
  ctx: SourceContext,
  kind?: NeedsYouKind,
): Promise<NeedsYouItem[]> => {
  const wanted = GROUPS.filter(
    (group) => kind === undefined || group.kinds.includes(kind),
  );
  const loaded = await Promise.all(wanted.map((group) => group.adapter(ctx)));
  return loaded
    .flat()
    .filter((item) => kind === undefined || item.kind === kind);
};
