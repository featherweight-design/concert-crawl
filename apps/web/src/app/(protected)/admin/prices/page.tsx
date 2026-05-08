import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'
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

const OUTCOME_KIND: Record<string, StatusKind> = {
  hit: 'success',
  miss: 'warning',
  error: 'danger',
}

export default async function AdminPricesPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const priceEvents = await apiClient
    .get<PriceEvent[]>('/v1/admin/prices/events', token)
    .catch(() => [] as PriceEvent[])

  const withPrices = priceEvents.filter((ev) => ev.priceMin !== null)
  const noPrices = priceEvents.filter((ev) => ev.priceMin === null)
  const recentHits = priceEvents.filter((ev) => ev.lastOutcome === 'hit')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead eyebrow="Phase 7 · Pricing" title="Price snapshots" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}
      >
        <StatCard
          label="Tracked events"
          value={String(priceEvents.length)}
          icon={DollarSign}
          kind="neutral"
        />
        <StatCard
          label="With prices"
          value={String(withPrices.length)}
          icon={TrendingUp}
          kind="success"
          hint={
            priceEvents.length > 0
              ? `${Math.round((withPrices.length / priceEvents.length) * 100)}% coverage`
              : undefined
          }
        />
        <StatCard
          label="No price data"
          value={String(noPrices.length)}
          icon={AlertTriangle}
          kind="warning"
        />
        <StatCard
          label="Recent hits"
          value={String(recentHits.length)}
          icon={DollarSign}
          kind="signal"
          hint="last retrieval ok"
        />
      </div>

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
