export const formatCost = (value: number): string => `$${value.toFixed(4)}`

export type StatusKind =
  | 'success'
  | 'warning'
  | 'danger'
  | 'signal'
  | 'accent'
  | 'neutral'

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
    bg: 'rgba(47,122,77,0.12)',
    fg: 'var(--success)',
    border: 'rgba(47,122,77,0.25)',
  },
  warning: {
    bg: 'rgba(255,210,122,0.15)',
    fg: 'var(--warning)',
    border: 'rgba(255,210,122,0.30)',
  },
  danger: {
    bg: 'rgba(184,56,26,0.12)',
    fg: 'var(--danger)',
    border: 'rgba(184,56,26,0.25)',
  },
  signal: {
    bg: 'rgba(29,95,191,0.12)',
    fg: 'var(--signal)',
    border: 'rgba(29,95,191,0.25)',
  },
  accent: {
    bg: 'rgba(122,58,168,0.12)',
    fg: 'var(--accent)',
    border: 'rgba(122,58,168,0.25)',
  },
  neutral: {
    bg: 'rgba(90,86,76,0.10)',
    fg: 'var(--fg-muted)',
    border: 'var(--border)',
  },
}
