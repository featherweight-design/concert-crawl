// One adapter per Needs you kind. Each reads the same population as the admin
// surface it replaces and returns display-ready items; none of them mutates.
// Ranking and snooze filtering happen in index.ts, not here.

import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  artistReports,
  artists,
  crawlRuns,
  db,
  events,
  feedback,
  priceSubmissions,
  userEvents,
  venues,
} from '@concert-crawl/db';
import type {
  NeedsYouAnswerOption,
  NeedsYouEvidenceLine,
  NeedsYouItem,
  NeedsYouKind,
} from '@concert-crawl/types';
import {
  hasUpcomingShowExpr,
  nextShowDateExpr,
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

/** Watching rows per event, in one query. Events nobody watches are absent. */
export const watcherCounts = async (
  eventIds: string[],
): Promise<Map<string, number>> => {
  if (eventIds.length === 0) return new Map();
  const rows = await db
    .select({
      eventId: userEvents.eventId,
      total: sql<number>`count(*)::int`,
    })
    .from(userEvents)
    .where(
      and(
        inArray(userEvents.eventId, eventIds),
        eq(userEvents.status, 'watching'),
      ),
    )
    .groupBy(userEvents.eventId);
  return new Map(rows.map((row) => [row.eventId, row.total]));
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

  return rows.map((row): NeedsYouItem => {
    const common = {
      title: row.title,
      venueId: row.venueId,
      venueName: row.venueName,
      fanDate: row.date,
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
      })
      .from(venues)
      .where(eq(venues.verified, true)),
    db.execute(sql`
      SELECT id, venue_id, status, http_status_code, error_message,
             events_found, events_usable, events_inserted, events_updated,
             furthest_event_date, created_at
      FROM (
        SELECT cr.id, cr.venue_id, cr.status, cr.http_status_code,
               cr.error_message, cr.events_found, cr.events_usable,
               cr.events_inserted, cr.events_updated, cr.furthest_event_date,
               cr.created_at,
               row_number() OVER (
                 PARTITION BY cr.venue_id ORDER BY cr.created_at DESC
               ) AS rn
        FROM ${crawlRuns} cr
        JOIN ${venues} vn ON vn.id = cr.venue_id AND vn.verified = true
      ) ranked
      WHERE rn <= ${TRIAGE_HISTORY_RUN_COUNT}
    `),
    db
      .select({
        venueId: events.venueId,
        soonest: sql<string>`min(${events.date})`,
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

  const items: NeedsYouItem[] = [];
  for (const fault of faults) {
    if (fault.condition !== 'failed' && fault.condition !== 'blocked') continue;
    const lastRuns = runs
      .filter((run) => run.venueId === fault.venueId)
      .sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      )
      .slice(0, 5)
      .map((run) => ({
        at: run.createdAt.toISOString(),
        status: run.status,
        errorMessage: run.errorMessage,
      }));
    const since = Date.parse(fault.persistedSince);
    const common = {
      venueId: fault.venueId,
      venueName: fault.venue,
      fanDate: soonestByVenue.get(fault.venueId) ?? null,
      watchers: 0,
      lastRuns,
    };

    if (fault.condition === 'failed') {
      items.push({
        ...common,
        key: `venue-failing:${fault.venueId}:${since}`,
        kind: 'venue-failing',
        title: `${fault.venue} crawl is failing`,
        cause: fault.evidence.errorClass,
        evidence: [
          ...line('Consecutive failures', fault.evidence.failures),
          ...line('Failing for', fault.dur),
          ...line('Error', fault.evidence.errorClass),
        ],
        answers: [
          answer('re_crawl_now', 'Re-crawl now'),
          answer('keep_paused', 'Keep paused'),
        ],
      });
    } else {
      items.push({
        ...common,
        key: `venue-blocked:${fault.venueId}:${since}`,
        kind: 'venue-blocked',
        title: `${fault.venue} is blocking the crawler`,
        cause:
          fault.evidence.status === null
            ? null
            : `HTTP ${fault.evidence.status}`,
        evidence: [
          ...line('Blocked for', fault.dur),
          ...line('HTTP status', fault.evidence.status),
          ...line('Refusals', fault.evidence.refusals),
          ...line('Last success', fault.evidence.lastSuccess),
        ],
        answers: [
          answer('re_crawl_once', 'Re-crawl once'),
          answer('pause_crawling', 'Pause crawling'),
        ],
      });
    }
  }
  return items;
};

// ---------------------------------------------------------------------------
// Artists
// ---------------------------------------------------------------------------

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
      reportCount: openReports,
      nextShow: nextShowDateExpr(ARTIST_HORIZON_DAYS),
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
    evidence: [
      ...line('Match status', row.matchStatus),
      ...line('Open reports', row.reportCount > 0 ? row.reportCount : null),
      ...line('Next show', row.nextShow),
    ],
    answers: [
      answer('pick_the_right_artist', 'Pick the right artist'),
      answer('keep_this_match', 'Keep this match', { undoable: true }),
      answer('no_photo', 'No photo'),
    ],
  }));
};

// ---------------------------------------------------------------------------
// Low-confidence events
// ---------------------------------------------------------------------------

const lowConfidenceItems: Adapter = async ({ now }) => {
  const today = denverDate(now);
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      date: events.date,
      venueId: events.venueId,
      venueName: venues.name,
      confidence: events.confidenceScore,
      strategy: events.extractionStrategy,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        eq(events.verified, false),
        // An event an admin ruled Not a concert is answered, not undecided.
        eq(events.hiddenFromConsumer, false),
        gte(events.date, today),
      ),
    );
  const watchers = await watcherCounts(rows.map((row) => row.id));

  return rows.map((row): NeedsYouItem => ({
    key: `event-low-confidence:${row.id}`,
    kind: 'event-low-confidence',
    title: row.title,
    venueId: row.venueId,
    venueName: row.venueName,
    fanDate: row.date,
    watchers: watchers.get(row.id) ?? 0,
    eventId: row.id,
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

const priceCheckItems: Adapter = async () => {
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
      checkedMin: priceSubmissions.priceMin,
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
      ),
    );
  const watchers = await watcherCounts(rows.map((row) => row.eventId));

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
        gte(
          priceSubmissions.corroborationCount,
          PRICE_BATCH_MIN_CORROBORATIONS,
        ),
        gte(events.date, addDays(today, PRICE_BATCH_MIN_DAYS)),
        lte(events.date, addDays(today, PRICE_BATCH_MAX_DAYS)),
      ),
    )
    .orderBy(asc(events.date), asc(priceSubmissions.id));
  const [first] = rows;
  if (!first) return [];

  return [
    {
      key: 'price-batch:all',
      kind: 'price-batch',
      title: `${rows.length} corroborated price submissions`,
      venueId: null,
      venueName: null,
      fanDate: first.date,
      watchers: 0,
      submissionIds: rows.map((row) => row.id),
      evidence: [
        ...line('Submissions', rows.length),
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

const bugItems: Adapter = async () => {
  const rows = await db
    .select({
      id: feedback.id,
      message: feedback.message,
      pageUrl: feedback.pageUrl,
      createdAt: feedback.createdAt,
    })
    .from(feedback)
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
