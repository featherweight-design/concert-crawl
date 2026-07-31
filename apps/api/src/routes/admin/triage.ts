// GET /v1/admin/triage — the derived live state behind the admin dashboard's
// "Needs attention" panel (#1215).
//
// Answers one question: what is wrong right now. Every row is recomputed per
// request from venue state, crawl-run history and the stored event catalogue,
// so a venue that recovers drops out of the payload on the next load without
// anything having to be marked read or dismissed. Nothing is read back out of
// `notifications`.
//
// Query budget: one grouped window function over crawl_runs, one aggregate
// over events, one venues scan, plus one small query per queue tier. Never
// N+1 per venue — there are ~11 venues today, and this sits on the page the
// admin opens most.
//
// The classification itself lives in lib/triage.ts and defers to the shared
// classifiers in crawler-core, so the panel and the alert emails can't drift.

import { Hono } from 'hono'
import { z } from 'zod'
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm'
import { db, events, priceSubmissions, venues } from '@concert-crawl/db'
import { createLogger } from '@concert-crawl/logger'
import type { AdminVariables } from './index.js'
import {
  TRIAGE_HISTORY_RUN_COUNT,
  deriveFaults,
  deriveSweep,
  type TriageRunRow,
} from './lib/triage.js'

const logger = createLogger('admin:triage')

// How many names the queue breakdown lines name before collapsing to "N more".
const QUEUE_BREAKDOWN_LIMIT = 3

// ---------------------------------------------------------------------------
// Response schema
// ---------------------------------------------------------------------------
//
// Field names match design/design_handoff_admin_triage/triage-data.jsx so the
// panel in PR 3 needs no adapter.

const faultBaseSchema = z.object({
  id: z.string(),
  venueId: z.string().uuid(),
  venue: z.string(),
  band: z.enum(['hard', 'loss', 'suspect']),
  persistedSince: z.string(),
  days: z.number(),
  dur: z.string(),
  crawlRunId: z.string().uuid().nullable(),
})

const faultSchema = z.discriminatedUnion('condition', [
  faultBaseSchema.extend({
    condition: z.literal('blocked'),
    evidence: z.object({
      status: z.number().nullable(),
      refusals: z.number(),
      lastSuccess: z.string().nullable(),
    }),
  }),
  faultBaseSchema.extend({
    condition: z.literal('failed'),
    evidence: z.object({
      failures: z.number(),
      errorClass: z.string(),
      pauseAt: z.number(),
    }),
  }),
  faultBaseSchema.extend({
    condition: z.literal('wentDark'),
    evidence: z.object({
      count: z.number(),
      baselineCount: z.number(),
      avg: z.number(),
      pct: z.number(),
      window: z.number(),
      threshold: z.number(),
      series: z.array(z.number()),
    }),
  }),
  faultBaseSchema.extend({
    condition: z.literal('ceiling'),
    evidence: z.object({
      kind: z.enum(['pinned_count', 'horizon_shrank']),
      count: z.number(),
      runs: z.number(),
      was: z.number().nullable(),
      wasWhen: z.string().nullable(),
      furthest: z.string().nullable(),
      best: z.string().nullable(),
      shrankDays: z.number().nullable(),
      series: z.array(z.number()),
    }),
  }),
  faultBaseSchema.extend({
    condition: z.literal('coverage'),
    evidence: z.object({
      matched: z.number(),
      expected: z.number(),
      uncovered: z.number(),
      wasWhen: z.string().nullable(),
    }),
  }),
])

const queueSchema = z.object({
  id: z.string(),
  kind: z.enum(['eventFlags', 'priceSubmissions']),
  count: z.number(),
  breakdown: z.string(),
  action: z.enum(['openReview', 'openSubmissions']),
})

const sweepSchema = z.object({
  venues: z.number(),
  at: z.string(),
  atIso: z.string().nullable(),
  events: z.number(),
  next: z.string(),
})

export const triageResponseSchema = z.object({
  faults: z.array(faultSchema),
  queues: z.array(queueSchema),
  sweep: sweepSchema,
})

export type TriageResponse = z.infer<typeof triageResponseSchema>

// ---------------------------------------------------------------------------
// Raw row parsing
// ---------------------------------------------------------------------------
//
// db.execute() hands back driver rows rather than typed Drizzle output, so the
// window-function result is validated at the boundary instead of cast. A row
// that doesn't parse is dropped and logged: losing one history row degrades a
// baseline, throwing takes the whole dashboard down.

const runRowSchema = z.object({
  id: z.string().uuid(),
  venue_id: z.string().uuid(),
  status: z.enum(['success', 'failed', 'partial', 'skipped']),
  http_status_code: z.number().int().nullable(),
  error_message: z.string().nullable(),
  events_found: z.number().int(),
  events_usable: z.number().int(),
  events_inserted: z.number().int(),
  events_updated: z.number().int(),
  furthest_event_date: z.string().nullable(),
  created_at: z.coerce.date(),
})

export const parseRunRows = (rows: Iterable<unknown>): TriageRunRow[] => {
  const parsed: TriageRunRow[] = []
  let dropped = 0
  for (const row of rows) {
    const result = runRowSchema.safeParse(row)
    if (!result.success) {
      dropped += 1
      continue
    }
    parsed.push({
      id: result.data.id,
      venueId: result.data.venue_id,
      status: result.data.status,
      httpStatusCode: result.data.http_status_code,
      errorMessage: result.data.error_message,
      eventsFound: result.data.events_found,
      eventsUsable: result.data.events_usable,
      eventsInserted: result.data.events_inserted,
      eventsUpdated: result.data.events_updated,
      furthestEventDate: result.data.furthest_event_date,
      createdAt: result.data.created_at,
    })
  }
  if (dropped > 0) {
    logger.warn(
      { dropped },
      'admin triage: crawl_runs rows failed schema validation and were skipped',
    )
  }
  return parsed
}

export const triageAdminRouter = new Hono<AdminVariables>()

triageAdminRouter.get('/', async (ctx) => {
  const now = new Date()

  // Verified venues only — an unverified draft has never been crawled and has
  // nothing to be broken about. Deliberately NOT filtered on `active`: crawl.ts
  // deactivates a venue at three consecutive failures, and that venue is the
  // most broken thing on the list.
  const venueRowsPromise = db
    .select({
      id: venues.id,
      name: venues.name,
      blockedAt: venues.blockedAt,
      consecutiveFailures: venues.consecutiveFailures,
      lastUrlCoverageAlertAt: venues.lastUrlCoverageAlertAt,
    })
    .from(venues)
    .where(eq(venues.verified, true))

  // One grouped window function for the whole run history. The classifiers
  // need enough depth to walk back to the start of the current streak, so this
  // reads the last TRIAGE_HISTORY_RUN_COUNT runs per venue in a single pass
  // rather than a query per venue.
  const runRowsPromise = db.execute(sql`
    SELECT id, venue_id, status, http_status_code, error_message,
           events_found, events_usable, events_inserted, events_updated,
           furthest_event_date, created_at
    FROM (
      SELECT cr.*,
             row_number() OVER (
               PARTITION BY cr.venue_id ORDER BY cr.created_at DESC
             ) AS rn
      FROM crawl_runs cr
      JOIN venues vn ON vn.id = cr.venue_id AND vn.verified = true
    ) ranked
    WHERE rn <= ${TRIAGE_HISTORY_RUN_COUNT}
  `)

  // Coverage is measured against the stored catalogue, not this run's
  // extraction — the sourceHash gate means a long-broken row never reappears
  // in a fresh extraction, but its "Get tickets" button is just as dead.
  // Filters mirror url-coverage-alert.ts exactly; drifting from them would let
  // the panel and the alert email disagree about the same venue.
  const coverageRowsPromise = db
    .select({
      venueId: events.venueId,
      upcomingCount: sql<number>`count(*)::int`,
      uncoveredCount: sql<number>`count(*) filter (
        where ${events.ticketUrl} is null and ${events.eventUrl} is null
      )::int`,
    })
    .from(events)
    .where(
      and(
        eq(events.status, 'upcoming'),
        gte(events.date, sql`(NOW() AT TIME ZONE 'America/Denver')::date`),
        isNull(events.firstMissingAt),
        eq(events.hiddenFromConsumer, false),
      ),
    )
    .groupBy(events.venueId)

  // Queue tiers. Both WHERE clauses stay in lock-step with
  // /v1/admin/review/counts — a pill that says "12 items" over a tab that
  // renders "queue clear" is issues #708/#709/#712 all over again.
  const denverToday = sql`(NOW() AT TIME ZONE 'America/Denver')::date`

  const eventFlagRowsPromise = db
    .select({
      venueName: venues.name,
      count: sql<number>`count(*)::int`,
      total: sql<number>`sum(count(*)) over ()::int`,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(and(eq(events.verified, false), gte(events.date, denverToday)))
    // Grouped by id, not name: only `slug` is unique, so two venues sharing a
    // name would have their counts merged into one breakdown row.
    .groupBy(venues.id, venues.name)
    .orderBy(desc(sql`count(*)`))
    .limit(QUEUE_BREAKDOWN_LIMIT)

  const priceRowsPromise = db
    .select({
      artist: events.artist,
      venueName: venues.name,
      total: sql<number>`count(*) over ()::int`,
    })
    .from(priceSubmissions)
    .innerJoin(events, eq(priceSubmissions.eventId, events.id))
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        eq(priceSubmissions.status, 'pending'),
        isNull(priceSubmissions.disputedSubmissionId),
      ),
    )
    .orderBy(desc(priceSubmissions.createdAt))
    .limit(QUEUE_BREAKDOWN_LIMIT)

  const [venueRows, rawRuns, coverageRows, eventFlagRows, priceRows] =
    await Promise.all([
      venueRowsPromise,
      runRowsPromise,
      coverageRowsPromise,
      eventFlagRowsPromise,
      priceRowsPromise,
    ])

  const runs = parseRunRows(rawRuns)

  const faults = deriveFaults({
    venues: venueRows,
    runs,
    // events.venue_id is nullable in the schema; a row without a venue can't be
    // attributed to a triage row, so it's dropped rather than coerced.
    coverage: coverageRows.filter(
      (row): row is typeof row & { venueId: string } => row.venueId !== null,
    ),
    now,
  })

  const queues: z.infer<typeof queueSchema>[] = []

  const eventFlagTotal = eventFlagRows[0]?.total ?? 0
  if (eventFlagTotal > 0) {
    queues.push({
      id: 'q-flags',
      kind: 'eventFlags',
      count: eventFlagTotal,
      breakdown: joinBreakdown(
        eventFlagRows.map((row) => `${row.venueName} ${row.count}`),
        eventFlagTotal - eventFlagRows.reduce((sum, row) => sum + row.count, 0),
      ),
      action: 'openReview',
    })
  }

  const priceTotal = priceRows[0]?.total ?? 0
  if (priceTotal > 0) {
    queues.push({
      id: 'q-prices',
      kind: 'priceSubmissions',
      count: priceTotal,
      breakdown: joinBreakdown(
        priceRows.map((row) => `${row.artist} @ ${row.venueName}`),
        priceTotal - priceRows.length,
      ),
      action: 'openSubmissions',
    })
  }

  const sweep = deriveSweep({ venueCount: venueRows.length, runs, now })

  // Parsed rather than returned raw: the panel's reading order and its
  // accessible row sentence both depend on this shape, and a silent contract
  // drift here would surface as a white screen on the busiest admin page.
  const parsed = triageResponseSchema.safeParse({ faults, queues, sweep })
  if (!parsed.success) {
    logger.error(
      { issues: parsed.error.issues },
      'admin triage: derived payload failed its own response schema',
    )
    return ctx.json({ success: false, error: 'Failed to derive triage' }, 500)
  }

  return ctx.json({ success: true, data: parsed.data })
})

// "Bluebird 5 · Gothic 4 · Ogden 3" — plus "· N more" when the tail is longer
// than the names shown.
const joinBreakdown = (parts: string[], remainder: number): string => {
  const shown = remainder > 0 ? [...parts, `${remainder} more`] : parts
  return shown.join(' · ')
}
