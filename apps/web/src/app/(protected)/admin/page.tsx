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
import { AttentionFeed } from '@/components/admin/dashboard/AttentionFeed'
import { DashboardGreeting } from '@/components/admin/dashboard/DashboardGreeting'
import { RunHistoryBlocks } from '@/components/admin/dashboard/RunHistoryBlocks'
import { CostPanel } from '@/components/admin/dashboard/CostPanel'
import type { AttentionItemData } from '@/components/admin/dashboard/AttentionFeed'
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
  ])
  return {
    status: rawStatus.map(toStatusRow),
    venues,
    runs,
    pendingEventCount: eventCounts.pending,
    pendingPriceCount: priceCounts.pending,
    dailyCosts,
    topSpend,
  }
}

function buildAttentionItems(
  status: ReturnType<typeof toStatusRow>[],
  venues: Venue[],
  pendingEventCount: number,
  pendingPriceCount: number,
): AttentionItemData[] {
  const items: AttentionItemData[] = []

  const failedVenues = status.filter(
    (row) => row.status === 'failed' || row.blockedAt !== null,
  )
  for (const venue of failedVenues.slice(0, 3)) {
    const venueName =
      venues.find((vn) => vn.id === venue.venueId)?.name ?? venue.venueId
    const isBlocked = venue.blockedAt !== null
    items.push({
      id: `crawl-${venue.venueId}`,
      severity: 'danger',
      iconName: isBlocked ? 'ShieldAlert' : 'AlertCircle',
      title: isBlocked
        ? ADMIN_COPY.dashboard.attentionItems.crawlBlocked(venueName)
        : ADMIN_COPY.dashboard.attentionItems.crawlFailed(venueName),
      meta: isBlocked
        ? ADMIN_COPY.dashboard.attentionItems.crawlBlockedMeta
        : ADMIN_COPY.dashboard.attentionItems.crawlFailedMeta(venue.status),
      timeLabel: ADMIN_COPY.dashboard.attentionItems.crawlTimeLabel,
      action: {
        label: ADMIN_COPY.dashboard.attentionItems.openCrawl,
        href: `/admin/crawl?venueId=${venue.venueId}`,
      },
    })
  }

  if (pendingEventCount > 0) {
    items.push({
      id: 'events-pending',
      severity: 'warning',
      iconName: 'CheckSquare',
      title:
        ADMIN_COPY.dashboard.attentionItems.eventsFlaggedTitle(
          pendingEventCount,
        ),
      meta: ADMIN_COPY.dashboard.attentionItems.eventsFlaggedMeta,
      timeLabel: ADMIN_COPY.dashboard.attentionItems.eventsTimeLabel,
      action: {
        label: ADMIN_COPY.dashboard.attentionItems.openReview,
        href: '/admin/review',
      },
    })
  }

  if (pendingPriceCount > 0) {
    items.push({
      id: 'prices-pending',
      severity: 'signal',
      iconName: 'DollarSign',
      title:
        ADMIN_COPY.dashboard.attentionItems.pricesWaitingTitle(
          pendingPriceCount,
        ),
      meta: ADMIN_COPY.dashboard.attentionItems.pricesMeta,
      timeLabel: ADMIN_COPY.dashboard.attentionItems.pricesTimeLabel,
      action: {
        label: ADMIN_COPY.dashboard.attentionItems.openPricesReview,
        href: '/admin/review?section=submissions',
      },
    })
  }

  return items
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
  } = await fetchDashboardData(token)

  const greenCount = status.filter(
    (row) => row.status === 'success' || row.status === 'skipped',
  ).length
  const totalEventsFound = status.reduce((sum, row) => sum + row.eventsFound, 0)
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

  const attentionItems = buildAttentionItems(
    status,
    venues,
    pendingEventCount,
    pendingPriceCount,
  )

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

  const lastRun = runs[0]
  const lastSweepLabel = lastRun
    ? new Date(lastRun.createdAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Denver',
      })
    : null

  const eventsIngested =
    totalEventsFound > 0 ? ` · ${totalEventsFound} events ingested` : ''
  const digestLabel =
    greenCount > 0 && lastSweepLabel
      ? `${greenCount} venue${greenCount === 1 ? '' : 's'} crawled cleanly · last sweep ${lastSweepLabel}${eventsIngested}`
      : greenCount > 0
        ? `${greenCount} venue${greenCount === 1 ? '' : 's'} crawled cleanly${eventsIngested}`
        : undefined

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

      {/* Stat row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
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

      {/* Attention feed */}
      <AttentionFeed
        items={attentionItems}
        {...(digestLabel ? { digestLabel } : {})}
        digestHref="/admin/crawl"
      />

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
