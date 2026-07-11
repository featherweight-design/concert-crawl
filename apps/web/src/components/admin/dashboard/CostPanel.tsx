import type { AdminDailyCosts, AdminTopSpend } from '@concert-crawl/types'
import {
  Panel,
  StatusBadge,
  MonoLabel,
  CostText,
  ProgressBar,
} from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { CostChart } from './CostChart'
import {
  computeWowTrend,
  buildCostAxisLabels,
} from '@/components/admin/dashboard/lib/dashboard'

// Admin dashboard "LLM spend" panel (#112 chart + #114 top spend by venue).
// Visual structure ports design/design_handoff_admin_ui/admin-dashboard.jsx
// CostPanel (lines 103–186): area chart + budget context on the left, ranked
// top-spend list on the right. Below lg the grid collapses to a single
// column with the chart above the list (mobile parity — 320px baseline).
// Total + captions use the JetBrains Mono stack — the same monospace styling
// CostText/MonoLabel use, inline like the other dashboard components.

const ADMIN_FONT = 'var(--admin-font, Inter, sans-serif)'
const ADMIN_MONO_FONT = "'JetBrains Mono', monospace"

interface CostPanelProps {
  daily: AdminDailyCosts
  topSpend: AdminTopSpend
  budgetUsd: number
}

export const CostPanel = ({ daily, topSpend, budgetUsd }: CostPanelProps) => {
  const copy = ADMIN_COPY.dashboard.costPanel
  const trend = computeWowTrend(daily.days)
  const axisLabels = buildCostAxisLabels(daily.days)
  const totalLabel = `$${daily.totalUsd.toFixed(2)}`
  const isEmpty = daily.totalUsd === 0

  return (
    <Panel
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{ fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700 }}
          >
            {copy.title}
          </span>
          {trend && (
            <StatusBadge
              kind={trend.good ? 'success' : 'warning'}
              mono
              aria-label={copy.wowBadgeAriaLabel(trend.text)}
            >
              {copy.wowBadge(trend.text)}
            </StatusBadge>
          )}
        </span>
      }
      padding={0}
    >
      {isEmpty ? (
        <div
          style={{
            padding: '20px 24px',
            fontFamily: ADMIN_FONT,
            fontSize: 13,
            color: 'var(--fg-muted)',
          }}
        >
          {copy.empty}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px]">
          {/* Chart cell */}
          <div
            className="border-b border-[var(--border)] lg:border-b-0 lg:border-r"
            style={{ padding: '20px 24px' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                marginBottom: 12,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontFamily: ADMIN_MONO_FONT,
                  fontSize: 32,
                  fontWeight: 700,
                  color: 'var(--fg)',
                  letterSpacing: '-0.01em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {totalLabel}
              </span>
              <span
                style={{
                  fontFamily: ADMIN_FONT,
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                }}
              >
                {copy.budgetCaption(budgetUsd)}
              </span>
            </div>
            <div style={{ width: '100%', height: 110, position: 'relative' }}>
              <CostChart
                data={daily.days.map((day) => day.costUsd)}
                ariaLabel={copy.chartAriaLabel(totalLabel)}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 8,
                fontFamily: ADMIN_MONO_FONT,
                fontSize: 10,
                color: 'var(--fg-subtle)',
                letterSpacing: '0.06em',
              }}
            >
              {axisLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>

          {/* Top spend cell */}
          <div
            style={{
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div>
              <MonoLabel>{copy.topSpendLabel}</MonoLabel>
              {topSpend.venues.length === 0 ? (
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: ADMIN_FONT,
                    fontSize: 12,
                    color: 'var(--fg-muted)',
                  }}
                >
                  {copy.topSpendEmpty}
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {topSpend.venues.map((venue) => (
                    <div key={venue.venueId ?? 'others'}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: ADMIN_FONT,
                            fontSize: 12,
                            color: 'var(--fg)',
                          }}
                        >
                          {venue.venueId === null
                            ? copy.othersLabel
                            : venue.name}
                        </span>
                        <span style={{ fontSize: 12 }}>
                          <CostText value={venue.costUsd} />
                        </span>
                      </div>
                      <ProgressBar value={venue.pct} kind="signal" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}
