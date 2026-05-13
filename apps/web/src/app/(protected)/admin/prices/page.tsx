import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import {
  SectionHead,
  StatCard,
  Panel,
  AdminTable,
  THead,
  TR,
  TH,
  TD,
  StatusBadge,
  RelTime,
} from '@/components/admin/primitives'
import {
  PipelineTriggerButton,
  ActivityFeedPanel,
} from '@/components/admin/prices'
import type { ActivityRow } from '@/components/admin/prices'
import type { StatusKind } from '@/components/admin/primitives'

// ---- Types ------------------------------------------------------------------

interface PriceEvent {
  eventId: string
  eventTitle: string | null
  artist: string
  venueName: string | null
  date: string
  ticketUrl: string | null
  priceMin: string | null
  priceMax: string | null
  priceSource: string | null
  lastRetrievedAt: string | null
  lastOutcome: string | null
}

interface CoverageData {
  total: number
  withPrice: number
  pct: number
}

interface HealthStat {
  venueId: string
  source: string
  totalCount: number
  hitCount: number
  lastAttemptedAt: string | null
}

interface HealthData {
  stats: HealthStat[]
  autoFlagged: HealthStat[]
}

// ---- Helpers ----------------------------------------------------------------

const OUTCOME_KIND: Record<string, StatusKind> = {
  hit: 'success',
  miss: 'warning',
  error: 'danger',
}

function aggregateBySource(stats: HealthStat[]): Array<{
  source: string
  total: number
  hits: number
  hitRate: number
  lastAttemptedAt: string | null
  flagged: boolean
}> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const bySource = new Map<
    string,
    { total: number; hits: number; lastAttemptedAt: string | null }
  >()

  for (const stat of stats) {
    const existing = bySource.get(stat.source) ?? {
      total: 0,
      hits: 0,
      lastAttemptedAt: null,
    }
    const latest =
      stat.lastAttemptedAt !== null &&
      (existing.lastAttemptedAt === null ||
        stat.lastAttemptedAt > existing.lastAttemptedAt)
        ? stat.lastAttemptedAt
        : existing.lastAttemptedAt

    bySource.set(stat.source, {
      total: existing.total + Number(stat.totalCount),
      hits: existing.hits + Number(stat.hitCount),
      lastAttemptedAt: latest,
    })
  }

  return Array.from(bySource.entries())
    .map(([source, data]) => ({
      source,
      total: data.total,
      hits: data.hits,
      hitRate: data.total > 0 ? Math.round((data.hits / data.total) * 100) : 0,
      lastAttemptedAt: data.lastAttemptedAt,
      // "0 hits in 30 days": tried recently but never succeeded
      flagged:
        data.hits === 0 &&
        data.lastAttemptedAt !== null &&
        new Date(data.lastAttemptedAt) >= thirtyDaysAgo,
    }))
    .sort((aa, bb) => bb.total - aa.total)
}

// ---- Page -------------------------------------------------------------------

export default async function AdminPricesPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const [priceEvents, coverage, activity, health] = await Promise.all([
    apiClient
      .get<PriceEvent[]>('/v1/admin/prices/events', token)
      .catch(() => [] as PriceEvent[]),
    apiClient
      .get<CoverageData>('/v1/admin/prices/coverage', token)
      .catch(() => ({ total: 0, withPrice: 0, pct: 0 })),
    apiClient
      .get<ActivityRow[]>('/v1/admin/prices/activity', token)
      .catch(() => [] as ActivityRow[]),
    apiClient
      .get<HealthData>('/v1/admin/prices/health', token)
      .catch(() => ({ stats: [], autoFlagged: [] })),
  ])

  const recentHits = priceEvents.filter((ev) => ev.lastOutcome === 'hit')
  const sourceHealth = aggregateBySource(health.stats)
  const flaggedCount = sourceHealth.filter((src) => src.flagged).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead eyebrow="Phase 7 · Pricing" title="Price snapshots" />

      {/* Stat cards — auto-fill wraps on narrow screens */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 16,
        }}
      >
        <StatCard
          label="Tracked events"
          value={String(coverage.total)}
          iconName="DollarSign"
          kind="neutral"
        />
        <StatCard
          label="With prices"
          value={String(coverage.withPrice)}
          iconName="TrendingUp"
          kind="success"
          hint={`${coverage.pct}% coverage`}
        />
        <StatCard
          label="No price data"
          value={String(coverage.total - coverage.withPrice)}
          iconName="AlertTriangle"
          kind="warning"
        />
        <StatCard
          label="Recent hits"
          value={String(recentHits.length)}
          iconName="CheckCircle"
          kind="signal"
          hint="last retrieval ok"
        />
        <StatCard
          label="Flagged sources"
          value={String(flaggedCount)}
          iconName="AlertOctagon"
          kind={flaggedCount > 0 ? 'danger' : 'neutral'}
          hint="0 hits in 30 days"
        />
      </div>

      {/* Activity + Health — above the event table, side-by-side on wide, stacked on narrow */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fill, minmax(min(100%, 480px), 1fr))',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <ActivityFeedPanel activity={activity as ActivityRow[]} />

        {/* Source health */}
        <Panel title="Source health" padding={0}>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            <AdminTable>
              <THead sticky>
                <tr>
                  <TH>Source</TH>
                  <TH align="right" mono>
                    Attempts
                  </TH>
                  <TH align="right" mono>
                    Hits
                  </TH>
                  <TH align="right" mono>
                    Rate
                  </TH>
                  <TH>Last attempt</TH>
                </tr>
              </THead>
              <tbody>
                {sourceHealth.map((row) => (
                  <TR key={row.source}>
                    <TD>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <StatusBadge
                          kind={row.flagged ? 'danger' : 'signal'}
                          variant="outline"
                        >
                          {row.source}
                        </StatusBadge>
                        {row.flagged && (
                          <StatusBadge kind="danger" dot>
                            flagged
                          </StatusBadge>
                        )}
                      </div>
                    </TD>
                    <TD align="right" mono color="var(--fg-muted)">
                      {row.total}
                    </TD>
                    <TD align="right" mono color="var(--fg-muted)">
                      {row.hits}
                    </TD>
                    <TD
                      align="right"
                      mono
                      color={
                        row.hitRate === 0
                          ? 'var(--danger)'
                          : row.hitRate < 50
                            ? 'var(--warning)'
                            : 'var(--success)'
                      }
                    >
                      {row.hitRate}%
                    </TD>
                    <TD color="var(--fg-muted)">
                      {row.lastAttemptedAt !== null ? (
                        <RelTime iso={row.lastAttemptedAt} />
                      ) : (
                        <span style={{ color: 'var(--fg-subtle)' }}>—</span>
                      )}
                    </TD>
                  </TR>
                ))}
                {sourceHealth.length === 0 && (
                  <TR>
                    <TD colSpan={5} color="var(--fg-subtle)">
                      No retrieval data yet.
                    </TD>
                  </TR>
                )}
              </tbody>
            </AdminTable>
          </div>
        </Panel>
      </div>

      {/* Event prices table */}
      <Panel title="Event prices" padding={0}>
        <AdminTable>
          <THead>
            <tr>
              <TH>Event</TH>
              <TH>Venue / Date</TH>
              <TH align="right" mono>
                Min
              </TH>
              <TH align="right" mono>
                Max
              </TH>
              <TH>Source</TH>
              <TH>Last retrieval</TH>
              <TH>Status</TH>
              <TH>Pipeline</TH>
            </tr>
          </THead>
          <tbody>
            {priceEvents.map((row) => (
              <TR key={row.eventId}>
                <TD>
                  <div style={{ fontWeight: 500 }}>
                    {row.eventTitle ?? row.artist}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                    {row.artist}
                  </div>
                </TD>
                <TD>
                  <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                    {row.venueName ?? '—'}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--fg-subtle)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {row.date}
                  </div>
                </TD>
                <TD
                  align="right"
                  mono
                  color={
                    row.priceMin !== null ? 'var(--fg)' : 'var(--fg-subtle)'
                  }
                >
                  {row.priceMin !== null
                    ? `$${parseFloat(row.priceMin).toFixed(0)}`
                    : '—'}
                </TD>
                <TD
                  align="right"
                  mono
                  color={
                    row.priceMax !== null ? 'var(--fg)' : 'var(--fg-subtle)'
                  }
                >
                  {row.priceMax !== null
                    ? `$${parseFloat(row.priceMax).toFixed(0)}`
                    : '—'}
                </TD>
                <TD>
                  {row.priceSource !== null ? (
                    <StatusBadge kind="signal" variant="outline">
                      {row.priceSource}
                    </StatusBadge>
                  ) : (
                    <span style={{ color: 'var(--fg-subtle)' }}>—</span>
                  )}
                </TD>
                <TD color="var(--fg-muted)">
                  {row.lastRetrievedAt !== null ? (
                    <RelTime iso={row.lastRetrievedAt} />
                  ) : (
                    <span style={{ color: 'var(--fg-subtle)' }}>—</span>
                  )}
                </TD>
                <TD>
                  {row.lastOutcome !== null ? (
                    <StatusBadge
                      kind={OUTCOME_KIND[row.lastOutcome] ?? 'neutral'}
                      dot
                    >
                      {row.lastOutcome}
                    </StatusBadge>
                  ) : (
                    <StatusBadge kind="neutral">unchecked</StatusBadge>
                  )}
                </TD>
                <TD>
                  <PipelineTriggerButton eventId={row.eventId} />
                </TD>
              </TR>
            ))}
            {priceEvents.length === 0 && (
              <TR>
                <TD colSpan={8} color="var(--fg-subtle)">
                  No events found. Run a crawl to populate data.
                </TD>
              </TR>
            )}
          </tbody>
        </AdminTable>
      </Panel>
    </div>
  )
}
