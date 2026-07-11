// Sub-$1 values show 4 decimals — per-run LLM costs are fractions of a
// cent, and "$0.00" hides real spend (mock: admin-primitives.jsx CostText).
export const formatCost = (value: number): string =>
  value === 0 ? '$0.00' : `$${value.toFixed(value < 1 ? 4 : 2)}`

export type StatusKind =
  'success' | 'warning' | 'danger' | 'signal' | 'accent' | 'neutral'

export const confidenceColor = (score: number): StatusKind => {
  if (score >= 0.8) return 'success'
  if (score >= 0.7) return 'signal'
  if (score >= 0.6) return 'warning'
  return 'danger'
}

export const KIND_COLORS: Record<
  StatusKind,
  { bg: string; fg: string; border: string }
> = {
  success: {
    bg: 'color-mix(in oklab, var(--success) 16%, transparent)',
    fg: 'var(--success)',
    border: 'color-mix(in oklab, var(--success) 35%, transparent)',
  },
  warning: {
    bg: 'color-mix(in oklab, var(--warning) 18%, transparent)',
    fg: 'var(--warning)',
    border: 'color-mix(in oklab, var(--warning) 38%, transparent)',
  },
  danger: {
    bg: 'color-mix(in oklab, var(--danger) 16%, transparent)',
    fg: 'var(--danger)',
    border: 'color-mix(in oklab, var(--danger) 38%, transparent)',
  },
  signal: {
    bg: 'color-mix(in oklab, var(--signal) 14%, transparent)',
    fg: 'var(--signal)',
    border: 'color-mix(in oklab, var(--signal) 32%, transparent)',
  },
  accent: {
    bg: 'color-mix(in oklab, var(--accent) 16%, transparent)',
    fg: 'var(--accent)',
    border: 'color-mix(in oklab, var(--accent) 36%, transparent)',
  },
  neutral: {
    bg: 'var(--surface-2)',
    fg: 'var(--fg-muted)',
    border: 'var(--border)',
  },
}
