import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import type { CrawlRun, Venue } from '@concert-crawl/types'
import {
  StatCard,
  AdminButton,
  ProgressBar,
  Sparkline,
} from '@/components/admin/primitives'
import { CrawlHealthTable } from '@/components/admin/dashboard/CrawlHealthTable'
import { AttentionFeed } from '@/components/admin/dashboard/AttentionFeed'
import type { AttentionItemData } from '@/components/admin/dashboard/AttentionFeed'
import {
  LLM_BUDGET_USD,
  toStatusRow,
  buildCrawlHealthHint,
  buildActiveVenuesHint,
  buildSparklineData,
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
  const [rawStatus, venues, runs, eventCounts, priceCounts] = await Promise.all(
    [
      apiClient
        .get<RawVenueStatus[]>('/v1/admin/crawl/status', token)
        .catch((err: unknown) => {
          throw new Error(
            `Failed to load crawl status: ${err instanceof Error ? err.message : String(err)}`,
          )
        }),
      apiClient
        .get<Venue[]>('/v1/admin/venues', token)
        .catch((err: unknown) => {
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
    ],
  )
  return {
    status: rawStatus.map(toStatusRow),
    venues,
    runs,
    pendingEventCount: eventCounts.pending,
    pendingPriceCount: priceCounts.pending,
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
    const venueName = venues.find((vn) => vn.id === venue.id)?.name ?? venue.id
    const isBlocked = venue.blockedAt !== null
    items.push({
      id: `crawl-${venue.id}`,
      severity: 'danger',
      iconName: isBlocked ? 'ShieldAlert' : 'AlertCircle',
      title: `${venueName} — crawl ${isBlocked ? 'blocked' : 'failed'}`,
      meta: isBlocked
        ? 'Venue blocked · crawl schedule paused'
        : `Status: ${venue.status} · check crawl inspector`,
      timeLabel: 'recent',
      action: {
        label: 'Open crawl',
        href: '/admin/crawl',
      },
    })
  }

  if (pendingEventCount > 0) {
    items.push({
      id: 'events-pending',
      severity: 'warning',
      iconName: 'CheckSquare',
      title: `${pendingEventCount} event${pendingEventCount === 1 ? '' : 's'} flagged for review`,
      meta: 'Needs manual verification before publishing',
      timeLabel: 'pending',
      action: {
        label: 'Open Review',
        href: '/admin/review',
      },
    })
  }

  if (pendingPriceCount > 0) {
    items.push({
      id: 'prices-pending',
      severity: 'signal',
      iconName: 'DollarSign',
      title: `${pendingPriceCount} price submission${pendingPriceCount === 1 ? '' : 's'} waiting`,
      meta: 'Community submissions need approval or dispute',
      timeLabel: 'pending',
      action: {
        label: 'Open Review',
        href: '/admin/review',
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

  const { status, venues, runs, pendingEventCount, pendingPriceCount } =
    await fetchDashboardData(token)

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const greenCount = status.filter((row) => row.status === 'success').length
  const blockedCount = status.filter(
    (row) => row.blockedAt !== null || row.status === 'failed',
  ).length
  const totalCost = runs.reduce((sum, run) => sum + (run.llmCostUsd ?? 0), 0)
  const llmBudgetPct = Math.round((totalCost / LLM_BUDGET_USD) * 100)

  const recentCost = runs
    .slice(0, 7)
    .reduce((sum, run) => sum + (run.llmCostUsd ?? 0), 0)
  const priorCost = runs
    .slice(7, 14)
    .reduce((sum, run) => sum + (run.llmCostUsd ?? 0), 0)
  const costTrend =
    priorCost > 0
      ? {
          dir: recentCost > priorCost ? ('up' as const) : ('down' as const),
          text: `${Math.round((Math.abs(recentCost - priorCost) / priorCost) * 100)}% wow`,
          good: recentCost <= priorCost,
        }
      : undefined

  const crawlHealthHint = buildCrawlHealthHint(status)
  const activeVenuesHint = buildActiveVenuesHint(venues)
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
      `${blockedCount} venue${blockedCount === 1 ? '' : 's'} need${blockedCount === 1 ? 's' : ''} attention`,
    )
  if (pendingEventCount > 0)
    summaryParts.push(`${pendingEventCount} events flagged`)
  if (pendingPriceCount > 0)
    summaryParts.push(`${pendingPriceCount} price submissions waiting`)
  if (summaryParts.length === 0)
    summaryParts.push(`${greenCount} of ${status.length} venues green`)

  const digestLabel =
    greenCount > 0
      ? `${greenCount} venue${greenCount === 1 ? '' : 's'} crawled cleanly · last sweep 3:02 AM`
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
            {greeting}, {firstName}.
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 16,
        }}
      >
        {/* Needs review */}
        <StatCard
          label="Needs review"
          value={String(pendingEventCount + pendingPriceCount)}
          unit="items"
          iconName="CheckSquare"
          kind={
            pendingEventCount + pendingPriceCount > 0 ? 'warning' : 'neutral'
          }
          hint={
            [
              pendingEventCount > 0 ? `${pendingEventCount} events` : '',
              pendingPriceCount > 0 ? `${pendingPriceCount} prices` : '',
            ]
              .filter(Boolean)
              .join(' · ') || undefined
          }
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
              >
                Open Review
              </AdminButton>
            </Link>
          }
        />

        {/* LLM cost */}
        <StatCard
          label="LLM cost · 30d"
          value={`$${totalCost.toFixed(2)}`}
          iconName="DollarSign"
          kind="signal"
          {...(costTrend !== undefined ? { trend: costTrend } : {})}
          footer={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                {`Budget $${LLM_BUDGET_USD} · ${llmBudgetPct}% used`}
              </div>
              <ProgressBar
                value={Math.min(llmBudgetPct, 100)}
                kind="signal"
                showLabel={false}
              />
            </div>
          }
        />

        {/* Crawl health */}
        <StatCard
          label="Crawl health"
          value={`${greenCount}/${status.length}`}
          unit="green"
          iconName="Activity"
          kind={blockedCount > 0 ? 'warning' : 'success'}
          {...(crawlHealthHint ? { hint: crawlHealthHint } : {})}
          footer={
            sparklineData.length > 0 ? (
              <Sparkline data={sparklineData} height={24} />
            ) : undefined
          }
        />

        {/* Active venues */}
        <StatCard
          label="Active venues"
          value={String(venues.filter((venue) => venue.active).length)}
          unit="venues"
          iconName="MapPin"
          kind="neutral"
          {...(activeVenuesHint ? { hint: activeVenuesHint } : {})}
        />
      </div>

      {/* Attention feed */}
      <AttentionFeed items={attentionItems} digestLabel={digestLabel} />

      {/* Crawl health detail */}
      <Panel title="Crawl health · today" padding={0}>
        <CrawlHealthTable rows={status} />
      </Panel>
    </div>
  )
}
