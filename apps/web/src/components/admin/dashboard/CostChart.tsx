import { useId } from 'react'

// Dependency-free SVG area chart ported from the admin design mock
// (design/design_handoff_admin_ui/admin-dashboard.jsx CostChart). Pure and
// server-compatible — useId works in RSC, so no 'use client' needed.
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
  // Daily cost values, oldest→newest (the zero-filled series from
  // GET /v1/admin/costs/daily).
  data: number[]
  // Screen-reader summary of the chart, e.g. the window total.
  ariaLabel: string
}

export const CostChart = ({ data, ariaLabel }: CostChartProps) => {
  const gradientId = useId()

  if (data.length === 0) return null

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

  return (
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
      {lastPoint && (
        <circle
          cx={lastPoint[0]}
          cy={lastPoint[1]}
          r="1.2"
          fill="var(--signal)"
        />
      )}
    </svg>
  )
}
