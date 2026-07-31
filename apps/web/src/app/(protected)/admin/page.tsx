import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import type {
  AdminDailyCosts,
  AdminTopSpend,
  CrawlRun,
  Venue,
} from '@concert-crawl/types'
import {
  StatCard,
  AdminButton,
  ProgressBar,
} from '@/components/admin/primitives'
import { CrawlHealthTable } from '@/components/admin/dashboard/CrawlHealthTable'
import { DashboardGreeting } from '@/components/admin/dashboard/DashboardGreeting'
import { RunHistoryBlocks } from '@/components/admin/dashboard/RunHistoryBlocks'
import { CostPanel } from '@/components/admin/dashboard/CostPanel'
import { TriagePanel, parseTriageResponse } from '@/components/admin/triage'
import {
  LLM_BUDGET_USD,
  toStatusRow,
  buildCrawlHealthHint,
  buildSparklineData,
  computeWowTrend,
} from '@/components/admin/dashboard/lib/dashboard'
import type { RawVenueStatus } from '@/components/admin/dashboard/lib/dashboard'
import { Panel } from '@/components/admin/primitives'

interface EventCount {
  pending: number
  approved: number
}

interface PriceSubmissionCount {
  pending: number
}

async function fetchDashboardData(token: string) {
  const [
    rawStatus,
    venues,
    runs,
    eventCounts,
    priceCounts,
    dailyCosts,
    topSpend,
    triage,
  ] = await Promise.all([
    apiClient
      .get<RawVenueStatus[]>('/v1/admin/crawl/status', token)
      .catch((err: unknown) => {
        throw new Error(
          `Failed to load crawl status: ${err instanceof Error ? err.message : String(err)}`,
        )
      }),
    apiClient.get<Venue[]>('/v1/admin/venues', token).catch((err: unknown) => {
      throw new Error(
        `Failed to load venues: ${err instanceof Error ? err.message : String(err)}`,
      )
    }),
    apiClient
      .get<CrawlRun[]>('/v1/admin/crawl/runs?limit=20', token)
      .catch((err: unknown) => {
        throw new Error(
          `Failed to load crawl runs: ${err instanceof Error ? err.message : String(err)}`,
        )
      }),
    apiClient
      .get<EventCount>('/v1/admin/events/count', token)
      .catch(() => ({ pending: 0, approved: 0 })),
    apiClient
      .get<PriceSubmissionCount>('/v1/admin/prices/submissions/count', token)
      .catch(() => ({ pending: 0 })),
    apiClient
      .get<AdminDailyCosts>('/v1/admin/costs/daily?days=30', token)
      .catch((err: unknown) => {
        throw new Error(
          `Failed to load daily LLM costs: ${err instanceof Error ? err.message : String(err)}`,
        )
      }),
    apiClient
      .get<AdminTopSpend>('/v1/admin/costs/top-venues?days=30', token)
      .catch((err: unknown) => {
        throw new Error(
          `Failed to load top LLM spend venues: ${err instanceof Error ? err.message : String(err)}`,
        )
      }),
    // Deliberately does NOT re-throw. The sibling fetches above take the page
    // to error.tsx when they fail, which is right for the data the dashboard
    // is built on. Triage is a health readout: if it cannot be reached the
    // panel degrades to a one-line explanation and the rest of the dashboard
    // — including the crawl health table below it — still renders.
    apiClient
      .get<unknown>('/v1/admin/triage', token)
      .then(parseTriageResponse)
      .catch(() => null),
  ])
  return {
    status: rawStatus.map(toStatusRow),
    venues,
    runs,
    pendingEventCount: eventCounts.pending,
    pendingPriceCount: priceCounts.pending,
    dailyCosts,
    topSpend,
    triage,
  }
}

export default async function AdminDashboardPage() {
  const user = await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const firstName = user.firstName ?? user.email

  const {
    status,
    venues,
    runs,
    pendingEventCount,
    pendingPriceCount,
    dailyCosts,
    topSpend,
    triage,
  } = await fetchDashboardData(token)

  const greenCount = status.filter(
    (row) => row.status === 'success' || row.status === 'skipped',
  ).length
  const blockedCount = status.filter(
    (row) => row.blockedAt !== null || row.status === 'failed',
  ).length
  const totalCost = dailyCosts.totalUsd
  const llmBudgetPct = Math.round((totalCost / LLM_BUDGET_USD) * 100)
  const costTrend = computeWowTrend(dailyCosts.days)

  const crawlHealthHint = buildCrawlHealthHint(status)

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const venuesPaused = venues.filter(
    (venue) => !venue.active && venue.blockedAt === null,
  ).length
  const venuesBlocked = venues.filter(
    (venue) => venue.blockedAt !== null,
  ).length
  const venuesAddedThisWeek = venues.filter(
    (venue) => Date.now() - new Date(venue.createdAt).getTime() < sevenDaysMs,
  ).length
  const activeVenuesHintParts = [
    venuesPaused > 0 ? `${venuesPaused} paused` : '',
    venuesBlocked > 0 ? `${venuesBlocked} blocked` : '',
  ].filter(Boolean)
  const activeVenuesHint = activeVenuesHintParts.join(' · ')
  const sparklineData = buildSparklineData(runs)

  const summaryParts: string[] = []
  if (blockedCount > 0)
    summaryParts.push(
      ADMIN_COPY.dashboard.summary.venuesNeedAttention(blockedCount),
    )
  if (pendingEventCount > 0)
    summaryParts.push(
      ADMIN_COPY.dashboard.summary.eventsFlagged(pendingEventCount),
    )
  if (pendingPriceCount > 0)
    summaryParts.push(
      ADMIN_COPY.dashboard.summary.pricesWaiting(pendingPriceCount),
    )
  if (summaryParts.length === 0)
    summaryParts.push(
      ADMIN_COPY.dashboard.summary.venuesGreen(greenCount, status.length),
    )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Greeting */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--admin-font, Inter, sans-serif)',
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--fg)',
              letterSpacing: '-0.025em',
            }}
          >
            <DashboardGreeting firstName={firstName} />
          </h1>
          <div
            style={{
              marginTop: 4,
              fontFamily: 'var(--admin-font, Inter, sans-serif)',
              fontSize: 13,
              color: 'var(--fg-muted)',
            }}
          >
            {summaryParts.join(' · ')}
          </div>
        </div>
      </div>

      {/* Stat row — matches Admin > Crawl: auto-fit lays out one 180px-min
          column per card as the container allows (single column at 320px, up to
          one track per StatCard on wide screens) and collapses empty tracks */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
        }}
      >
        {/* Needs review */}
        <StatCard
          label={ADMIN_COPY.dashboard.statCards.needsReview}
          value={String(pendingEventCount + pendingPriceCount)}
          unit={ADMIN_COPY.dashboard.statCards.needsReviewUnit}
          iconName="CalendarCheck"
          kind={
            pendingEventCount + pendingPriceCount > 0 ? 'warning' : 'neutral'
          }
          {...(() => {
            const hint = [
              pendingEventCount > 0 ? `${pendingEventCount} events` : '',
              pendingPriceCount > 0 ? `${pendingPriceCount} prices` : '',
            ]
              .filter(Boolean)
              .join(' · ')
            return hint ? { hint } : {}
          })()}
          footer={
            <Link
              href="/admin/review"
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <AdminButton
                variant="ghost"
                size="sm"
                iconRight={ChevronRight}
                fullWidth
                style={{ fontWeight: 700, color: 'var(--fg)' }}
              >
                {ADMIN_COPY.dashboard.buttons.openReview}
              </AdminButton>
            </Link>
          }
        />

        {/* LLM cost */}
        <StatCard
          label={ADMIN_COPY.dashboard.statCards.llmCost}
          value={`$${totalCost.toFixed(2)}`}
          iconName="DollarSign"
          kind="signal"
          hint={ADMIN_COPY.dashboard.budget.hint(LLM_BUDGET_USD, llmBudgetPct)}
          {...(costTrend !== undefined ? { trend: costTrend } : {})}
          footer={
            <ProgressBar
              value={Math.min(llmBudgetPct, 100)}
              kind="signal"
              showLabel={false}
            />
          }
        />

        {/* Crawl health */}
        <StatCard
          label={ADMIN_COPY.dashboard.statCards.crawlHealth}
          value={`${greenCount}/${status.length}`}
          unit={ADMIN_COPY.dashboard.statCards.crawlHealthUnit}
          iconName="Activity"
          kind="success"
          {...(crawlHealthHint ? { hint: crawlHealthHint } : {})}
          footer={
            sparklineData.length > 0 ? (
              <RunHistoryBlocks data={sparklineData} />
            ) : undefined
          }
        />

        {/* Active venues */}
        <StatCard
          label={ADMIN_COPY.dashboard.statCards.activeVenues}
          value={String(venues.filter((venue) => venue.active).length)}
          unit={ADMIN_COPY.dashboard.activeVenues.venuesOfTotal(venues.length)}
          iconName="MapPin"
          kind="neutral"
          mono={false}
          {...(activeVenuesHint ? { hint: activeVenuesHint } : {})}
          footer={
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--fg-subtle)',
              }}
            >
              {ADMIN_COPY.dashboard.activeVenues.addedThisWeek(
                venuesAddedThisWeek,
              )}
            </span>
          }
        />
      </div>

      {/* Triage — every fault the crawler reported, never truncated */}
      <TriagePanel data={triage} />

      {/* LLM spend */}
      <CostPanel
        daily={dailyCosts}
        topSpend={topSpend}
        budgetUsd={LLM_BUDGET_USD}
      />

      {/* Crawl health detail */}
      <Panel title={ADMIN_COPY.dashboard.panels.crawlHealthToday} padding={0}>
        <CrawlHealthTable rows={status} />
      </Panel>
    </div>
  )
}
