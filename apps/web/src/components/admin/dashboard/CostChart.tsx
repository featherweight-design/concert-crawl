'use client'

import { useId, useState } from 'react'
import type { DailyCost } from '@concert-crawl/types'
import { formatCostTooltip } from './lib/dashboard'

// Dependency-free SVG area chart ported from the admin design mock
// (design/design_handoff_admin_ui/admin-dashboard.jsx CostChart), plus a
// hover/tap tooltip showing the day's spend (#881). Pointer events (not
// mouse events) so a single handler covers mouse hover and touch taps.
// Token-only colors: var(--signal) for the series, var(--border) for the
// dashed gridlines.

const VIEWBOX_WIDTH = 100
const VIEWBOX_HEIGHT = 100
// Vertical padding inside the viewBox so the line's peak and the terminal
// dot never clip against the top edge (matches the mock's `h - 8`/`- 2`).
const TOP_HEADROOM = 8
const BASELINE_INSET = 2
const GRIDLINE_POSITIONS = [25, 50, 75]

interface CostChartProps {
  // Daily costs, oldest→newest (the zero-filled series from
  // GET /v1/admin/costs/daily).
  days: DailyCost[]
  // Screen-reader summary of the chart, e.g. the window total.
  ariaLabel: string
}

export const CostChart = ({ days, ariaLabel }: CostChartProps) => {
  const gradientId = useId()
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  if (days.length === 0) return null

  const data = days.map((day) => day.costUsd)
  const max = Math.max(...data)
  const scale = max > 0 ? max : 1
  const stepX = data.length > 1 ? VIEWBOX_WIDTH / (data.length - 1) : 0
  const points: [number, number][] = data.map((value, idx) => [
    idx * stepX,
    VIEWBOX_HEIGHT -
      (value / scale) * (VIEWBOX_HEIGHT - TOP_HEADROOM) -
      BASELINE_INSET,
  ])
  const linePath = points
    .map((point, idx) => `${idx === 0 ? 'M' : 'L'}${point[0]},${point[1]}`)
    .join(' ')
  const areaPath = `${linePath} L${VIEWBOX_WIDTH},${VIEWBOX_HEIGHT} L0,${VIEWBOX_HEIGHT} Z`
  const lastPoint = points[points.length - 1]

  const hoverDay = hoverIdx !== null ? days[hoverIdx] : undefined
  const hoverPoint = hoverIdx !== null ? points[hoverIdx] : undefined
  // Points are evenly spaced across the full viewBox width, so the viewBox x
  // coordinate (0–100) doubles as the CSS left percentage for the tooltip.
  const hoverXPct = hoverPoint ? hoverPoint[0] : 0

  const updateHover = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width === 0) return
    const ratio = (event.clientX - rect.left) / rect.width
    const idx = Math.round(ratio * (days.length - 1))
    setHoverIdx(Math.min(days.length - 1, Math.max(0, idx)))
  }

  return (
    <div
      onPointerMove={updateHover}
      onPointerDown={updateHover}
      onPointerLeave={() => setHoverIdx(null)}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        // Prevents touch scrolling from fighting the tap-to-inspect gesture
        // while still allowing vertical page scroll to start elsewhere.
        touchAction: 'pan-y',
      }}
    >
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {GRIDLINE_POSITIONS.map((yPos) => (
          <line
            key={yPos}
            x1="0"
            y1={yPos}
            x2={VIEWBOX_WIDTH}
            y2={yPos}
            stroke="var(--border)"
            strokeWidth="0.3"
            strokeDasharray="1 1.5"
          />
        ))}
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          stroke="var(--signal)"
          strokeWidth="0.9"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
        {hoverPoint && (
          <line
            x1={hoverPoint[0]}
            y1="0"
            x2={hoverPoint[0]}
            y2={VIEWBOX_HEIGHT}
            stroke="var(--border-strong)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {lastPoint && (
          <circle
            cx={lastPoint[0]}
            cy={lastPoint[1]}
            r="1.2"
            fill="var(--signal)"
          />
        )}
        {hoverPoint && (
          <circle
            cx={hoverPoint[0]}
            cy={hoverPoint[1]}
            r="1.4"
            fill="var(--signal)"
          />
        )}
      </svg>
      {hoverDay && (
        // Visual-only affordance: the day detail duplicates data already
        // summarized by the chart's aria-label, and a live region here would
        // announce continuously as the pointer moves.
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: `${hoverXPct}%`,
            // Flip anchoring near the edges so the tooltip never clips
            // outside the chart (Panel has overflow: hidden).
            transform: `translateX(${
              hoverXPct < 12 ? '0' : hoverXPct > 88 ? '-100%' : '-50%'
            })`,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            padding: '3px 8px',
            borderRadius: 6,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--fg)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatCostTooltip(hoverDay)}
        </div>
      )}
    </div>
  )
}
