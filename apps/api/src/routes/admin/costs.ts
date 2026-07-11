import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { desc, eq, sql } from 'drizzle-orm'
import { db, crawlRuns, venues } from '@concert-crawl/db'
import type {
  AdminDailyCosts,
  AdminTopSpend,
  TopSpendVenue,
} from '@concert-crawl/types'
import type { AdminVariables } from './index.js'

// GET-only router — the admin audit-log middleware skips GET requests, so
// no audit wiring is needed here (#112, #114).

const daysQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
})

const MT_TIME_ZONE = 'America/Denver'

// Displayed when a crawl run's venue row is missing (deleted venue with
// surviving runs). Purely defensive — venue_id is a real FK in practice.
const UNKNOWN_VENUE_NAME = '(unknown venue)'

// How many named venues the top-spend endpoint returns before collapsing the
// remainder into a single "(others)" row (venueId: null).
const TOP_VENUES_LIMIT = 3

// Mountain-Time calendar date (YYYY-MM-DD) for a UTC timestamp. This is the
// JS mirror of the SQL day-bucket expression below
// (`(created_at AT TIME ZONE 'America/Denver')::date`) — the two MUST stay
// in lockstep or zero-fill windows drift from the DB buckets. en-CA gives
// ISO YYYY-MM-DD formatting.
export const mountainDateString = (date: Date): string =>
  date.toLocaleDateString('en-CA', { timeZone: MT_TIME_ZONE })

// Contiguous list of `days` calendar dates (YYYY-MM-DD) ending at `endDate`,
// oldest first. Pure calendar-date arithmetic in UTC — DST-safe because we
// never convert these strings back through a timezone.
export const listWindowDates = (days: number, endDate: string): string[] => {
  const [year, month, day] = endDate.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined) {
    return [endDate]
  }
  const endUtcMs = Date.UTC(year, month - 1, day)
  const dayMs = 24 * 60 * 60 * 1000
  const dates: string[] = []
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(endUtcMs - offset * dayMs)
    const isoDate = date.toISOString().slice(0, 10)
    dates.push(isoDate)
  }
  return dates
}

const roundUsd = (value: number): number => Math.round(value * 100) / 100

// Day-bucket expression shared by both endpoints: the MT-local calendar day
// a run happened on. Qualified column reference, safe under joins/aliases.
// Built per-request (not at module scope) so importing this router never
// invokes drizzle's `sql` tag — several route test suites mock 'drizzle-orm'
// with only the operators they use, and a module-level fragment would throw
// at import time in those suites.
// MT_TIME_ZONE is inlined as a literal (not a bind parameter) because the
// fragment appears in both SELECT and GROUP BY — separate bind params would
// break Postgres's structural GROUP BY expression matching.
const mtDayBucket = () =>
  sql`(${crawlRuns.createdAt} AT TIME ZONE ${sql.raw(`'${MT_TIME_ZONE}'`)})::date`

export const costsAdminRouter = new Hono<AdminVariables>()

// GET /v1/admin/costs/daily?days=30 — per-MT-day LLM spend over a rolling
// window, zero-filled so the chart never has gaps. llm_cost_usd is nullable
// (structured-data runs never touch the LLM), so the aggregate is
// coalesce(sum(...), 0) — the endpoint always returns numbers.
costsAdminRouter.get(
  '/daily',
  zValidator('query', daysQuerySchema),
  async (ctx) => {
    const { days } = ctx.req.valid('query')

    const today = mountainDateString(new Date())
    const windowDates = listWindowDates(days, today)
    const windowStart = windowDates[0] ?? today

    const rows = await db
      .select({
        date: sql<string>`(${mtDayBucket()})::text`,
        costUsd: sql<number>`coalesce(sum(${crawlRuns.llmCostUsd}), 0)`,
      })
      .from(crawlRuns)
      .where(sql`${mtDayBucket()} >= ${windowStart}::date`)
      .groupBy(mtDayBucket())

    const costsByDate = new Map(
      rows.map((row) => [row.date, roundUsd(Number(row.costUsd))]),
    )
    const dayBuckets = windowDates.map((date) => ({
      date,
      costUsd: costsByDate.get(date) ?? 0,
    }))
    const totalUsd = roundUsd(
      dayBuckets.reduce((sum, bucket) => sum + bucket.costUsd, 0),
    )

    const data: AdminDailyCosts = { days: dayBuckets, totalUsd }
    return ctx.json({ success: true, data })
  },
)

// GET /v1/admin/costs/top-venues?days=30 — per-venue LLM spend over the same
// rolling MT-day window: top 3 venues by spend plus an aggregated "(others)"
// remainder row (venueId: null). Venues with zero spend are excluded.
costsAdminRouter.get(
  '/top-venues',
  zValidator('query', daysQuerySchema),
  async (ctx) => {
    const { days } = ctx.req.valid('query')

    const today = mountainDateString(new Date())
    const windowDates = listWindowDates(days, today)
    const windowStart = windowDates[0] ?? today

    const costSum = sql<number>`coalesce(sum(${crawlRuns.llmCostUsd}), 0)`
    const rows = await db
      .select({
        venueId: crawlRuns.venueId,
        name: venues.name,
        costUsd: costSum,
      })
      .from(crawlRuns)
      .leftJoin(venues, eq(crawlRuns.venueId, venues.id))
      .where(sql`${mtDayBucket()} >= ${windowStart}::date`)
      .groupBy(crawlRuns.venueId, venues.name)
      .having(sql`coalesce(sum(${crawlRuns.llmCostUsd}), 0) > 0`)
      .orderBy(desc(costSum))

    const ranked = rows.map((row) => ({
      venueId: row.venueId,
      name: row.name ?? UNKNOWN_VENUE_NAME,
      costUsd: roundUsd(Number(row.costUsd)),
    }))
    const totalUsd = roundUsd(
      ranked.reduce((sum, venue) => sum + venue.costUsd, 0),
    )
    const shareOfTotal = (costUsd: number): number =>
      totalUsd > 0 ? Math.round((costUsd / totalUsd) * 100) : 0

    const topVenues: TopSpendVenue[] = ranked
      .slice(0, TOP_VENUES_LIMIT)
      .map((venue) => ({ ...venue, pct: shareOfTotal(venue.costUsd) }))

    const remainder = ranked.slice(TOP_VENUES_LIMIT)
    if (remainder.length > 0) {
      const othersCost = roundUsd(
        remainder.reduce((sum, venue) => sum + venue.costUsd, 0),
      )
      topVenues.push({
        venueId: null,
        name: '(others)',
        costUsd: othersCost,
        pct: shareOfTotal(othersCost),
      })
    }

    const data: AdminTopSpend = { venues: topVenues, totalUsd }
    return ctx.json({ success: true, data })
  },
)
