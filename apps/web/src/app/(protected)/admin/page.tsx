import {
  DollarSign,
  Activity,
  CheckSquare,
  MapPin,
  ChevronRight,
} from 'lucide-react'
import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import type { CrawlRun, Venue } from '@concert-crawl/types'
import {
  StatCard,
  Panel,
  AdminTable,
  THead,
  TR,
  TH,
  TD,
  StatusBadge,
  AdminButton,
  ProgressBar,
  CostText,
  RelTime,
} from '@/components/admin/primitives'
import type { StatusKind } from '@/components/admin/primitives'
import { ActivityFeed } from '@/components/admin/dashboard/ActivityFeed'

interface CrawlStatusRow {
  venueId: string
  venueName: string
  status: string
  lastRunAt: string | null
  eventsFound: number
  strategy: string
  cost: number
  error: string | null
}

interface RawVenueStatus {
  id: string
  name: string
  active: boolean
  verified: boolean
  consecutiveFailures: number
  blockedAt: string | null
  lastCrawledAt: string | null
  lastRun: {
    id: string
    venueId: string
    status: string
    createdAt: string
    eventsFound: number
    eventsInserted: number
    errorMessage: string | null
    extractionStrategyUsed: string | null
  } | null
}

function toStatusRow(venue: RawVenueStatus): CrawlStatusRow {
  return {
    venueId: venue.id,
    venueName: venue.name,
    status: venue.lastRun?.status ?? 'never',
    lastRunAt: venue.lastRun?.createdAt ?? null,
    eventsFound: venue.lastRun?.eventsFound ?? 0,
    strategy: venue.lastRun?.extractionStrategyUsed ?? '—',
    cost: 0,
    error: venue.lastRun?.errorMessage ?? null,
  }
}

async function fetchDashboardData(token: string) {
  const [rawStatus, venues, runs] = await Promise.all([
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
  ])
  return { status: rawStatus.map(toStatusRow), venues, runs }
}

const STATUS_KIND: Record<string, StatusKind> = {
  success: 'success',
  failed: 'danger',
  blocked: 'danger',
  partial: 'warning',
  paused: 'warning',
  never: 'neutral',
}

export default async function AdminDashboardPage() {
  const user = await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const firstName = user.firstName ?? user.email

  const { status, venues, runs } = await fetchDashboardData(token)

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Greeting */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
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
      </div>

      {/* Stat row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}
      >
        <StatCard
          label="Pending review"
          value="0"
          unit="events"
          icon={CheckSquare}
          kind="warning"
          footer={
            <AdminButton
              variant="ghost"
              size="sm"
              iconRight={ChevronRight}
              fullWidth
            >
              Open queue
            </AdminButton>
          }
        />
        <StatCard
          label="LLM cost · 30d"
          value={`$${totalCost.toFixed(2)}`}
          icon={DollarSign}
          kind="signal"
          {...(costTrend !== undefined ? { trend: costTrend } : {})}
          footer={
            <ProgressBar
              value={Math.round((totalCost / 40) * 100)}
              kind="signal"
              showLabel={false}
            />
          }
        />
        <StatCard
          label="Crawl health"
          value={`${greenCount}/${status.length}`}
          unit="green"
          icon={Activity}
          kind={blockedCount > 0 ? 'warning' : 'success'}
          hint={
            blockedCount > 0 ? `${blockedCount} blocked` : 'All venues healthy'
          }
        />
        <StatCard
          label="Active venues"
          value={String(venues.filter((venue) => venue.active).length)}
          unit="venues"
          icon={MapPin}
          kind="neutral"
        />
      </div>

      {/* Health table + Activity feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Panel title="Crawl health · today" padding={0}>
          <AdminTable>
            <THead>
              <tr>
                <TH>Venue</TH>
                <TH>Status</TH>
                <TH>Last crawl</TH>
                <TH align="right" mono>
                  Events
                </TH>
                <TH align="right" mono>
                  Cost
                </TH>
              </tr>
            </THead>
            <tbody>
              {status.map((row) => (
                <TR key={row.venueId}>
                  <TD>{row.venueName}</TD>
                  <TD>
                    <StatusBadge
                      kind={STATUS_KIND[row.status] ?? 'neutral'}
                      dot
                    >
                      {row.status}
                    </StatusBadge>
                  </TD>
                  <TD color="var(--fg-muted)">
                    {row.lastRunAt ? <RelTime iso={row.lastRunAt} /> : '—'}
                  </TD>
                  <TD align="right" mono>
                    {row.eventsFound}
                  </TD>
                  <TD align="right">
                    <CostText value={row.cost} />
                  </TD>
                </TR>
              ))}
            </tbody>
          </AdminTable>
        </Panel>

        <Panel title="Recent activity">
          <ActivityFeed runs={runs} />
        </Panel>
      </div>
    </div>
  )
}
