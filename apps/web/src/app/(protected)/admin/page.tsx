import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import type { CrawlRun, Event, Venue } from '@concert-crawl/types'
import {
  StatCard,
  Panel,
  AdminButton,
  ProgressBar,
  Sparkline,
} from '@/components/admin/primitives'
import { ActivityFeed } from '@/components/admin/dashboard/ActivityFeed'
import { RunAllVenuesButton } from '@/components/admin/dashboard/RunAllVenuesButton'
import { CrawlHealthTable } from '@/components/admin/dashboard/CrawlHealthTable'
import {
  LLM_BUDGET_USD,
  toStatusRow,
  buildPendingReviewHint,
  buildCrawlHealthHint,
  buildActiveVenuesHint,
  buildSparklineData,
} from '@/components/admin/dashboard/lib/dashboard'
import type {
  RawVenueStatus,
  CrawlStatusRow,
} from '@/components/admin/dashboard/lib/dashboard'

async function fetchDashboardData(token: string) {
  const [rawStatus, venues, runs, pendingEvents] = await Promise.all([
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
      .get<Event[]>('/v1/admin/events?verified=false&limit=100', token)
      .catch(() => [] as Event[]),
  ])
  return { status: rawStatus.map(toStatusRow), venues, runs, pendingEvents }
}

export default async function AdminDashboardPage() {
  const user = await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const firstName = user.firstName ?? user.email

  const { status, venues, runs, pendingEvents } =
    await fetchDashboardData(token)

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const greenCount = status.filter((row) => row.status === 'success').length
  const blockedCount = status.filter(
    (row) => row.status === 'blocked' || row.status === 'failed',
  ).length
  const totalCost = runs.reduce((sum, run) => sum + (run.llmCostUsd ?? 0), 0)

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

  const pendingHint = buildPendingReviewHint(pendingEvents, venues)
  const crawlHealthHint = buildCrawlHealthHint(status)
  const activeVenuesHint = buildActiveVenuesHint(venues)
  const sparklineData = buildSparklineData(runs)

  async function triggerAllVenues() {
    'use server'
    const { getToken: getActionToken } = await auth()
    const actionToken = await getActionToken()
    if (!actionToken) return
    const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
    const activeVenues = venues.filter(
      (venue) => venue.active && venue.verified,
    )
    await Promise.allSettled(
      activeVenues.map((venue) =>
        fetch(`${apiUrl}/v1/admin/crawl/${venue.id}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${actionToken}`,
            'Content-Type': 'application/json',
          },
        }),
      ),
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Greeting */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: "'Inter', sans-serif",
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--fg)',
              letterSpacing: '-0.025em',
            }}
          >
            {greeting}, {firstName}.
          </h1>
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--fg-muted)' }}>
            {greenCount} of {status.length} venues green ·{' '}
            {blockedCount > 0 ? `${blockedCount} blocked` : 'all healthy'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <RunAllVenuesButton action={triggerAllVenues} />
          <Link href="/admin/venues/new" style={{ textDecoration: 'none' }}>
            <AdminButton variant="outline" size="sm">
              + Add venue
            </AdminButton>
          </Link>
        </div>
      </div>

      {/* Stat row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}
      >
        {/* Pending review */}
        <StatCard
          label="Pending review"
          value={String(pendingEvents.length)}
          unit="events"
          iconName="CheckSquare"
          kind="warning"
          {...(pendingHint ? { hint: pendingHint } : {})}
          footer={
            <Link
              href="/admin/events"
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <AdminButton
                variant="ghost"
                size="sm"
                iconRight={ChevronRight}
                fullWidth
              >
                Open queue
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
            <ProgressBar
              value={Math.min(
                Math.round((totalCost / LLM_BUDGET_USD) * 100),
                100,
              )}
              kind="signal"
              showLabel={false}
            />
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

      {/* Health table + Activity feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Panel title="Crawl health · today" padding={0}>
          <CrawlHealthTable rows={status} />
        </Panel>

        <Panel title="Recent activity">
          <ActivityFeed runs={runs} />
        </Panel>
      </div>
    </div>
  )
}
