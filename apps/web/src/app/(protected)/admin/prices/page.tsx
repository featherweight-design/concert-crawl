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

// ---- Helpers ----------------------------------------------------------------

const OUTCOME_KIND: Record<string, StatusKind> = {
  hit: 'success',
  miss: 'warning',
  error: 'danger',
}

// ---- Page -------------------------------------------------------------------

export default async function AdminPricesPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const [priceEvents, coverage] = await Promise.all([
    apiClient
      .get<PriceEvent[]>('/v1/admin/prices/events', token)
      .catch(() => [] as PriceEvent[]),
    apiClient
      .get<CoverageData>('/v1/admin/prices/coverage', token)
      .catch(() => ({ total: 0, withPrice: 0, pct: 0 })),
  ])

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
              </TR>
            ))}
            {priceEvents.length === 0 && (
              <TR>
                <TD colSpan={7} color="var(--fg-subtle)">
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
