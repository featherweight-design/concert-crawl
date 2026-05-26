export const REPORT_TOKENS = {
  cancelled: {
    color: 'var(--danger)',
    bg: 'color-mix(in oklab, var(--danger) 8%, transparent)',
    bgStrong: 'color-mix(in oklab, var(--danger) 14%, transparent)',
    border: 'color-mix(in oklab, var(--danger) 36%, transparent)',
    label: 'Cancelled',
    short: 'cancelled',
  },
  postponed: {
    color: 'var(--warning)',
    bg: 'color-mix(in oklab, var(--warning) 8%, transparent)',
    bgStrong: 'color-mix(in oklab, var(--warning) 14%, transparent)',
    border: 'color-mix(in oklab, var(--warning) 36%, transparent)',
    label: 'Postponed',
    short: 'postponed',
  },
  'sold-out': {
    color: 'var(--warning)',
    bg: 'color-mix(in oklab, var(--warning) 8%, transparent)',
    bgStrong: 'color-mix(in oklab, var(--warning) 14%, transparent)',
    border: 'color-mix(in oklab, var(--warning) 36%, transparent)',
    label: 'Sold out',
    short: 'sold-out',
  },
  available: {
    color: 'var(--success)',
    bg: 'color-mix(in oklab, var(--success) 8%, transparent)',
    bgStrong: 'color-mix(in oklab, var(--success) 14%, transparent)',
    border: 'color-mix(in oklab, var(--success) 36%, transparent)',
    label: 'Tickets available',
    short: 'available',
  },
} as const

export type ReportTokenKey = keyof typeof REPORT_TOKENS
export type ReportToken = (typeof REPORT_TOKENS)[ReportTokenKey]
