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
  // Sold out is the accent, not amber (README rule 3; more-st-report_m,
  // more-st-ev_sold_pending_m): amber stays with Postponed.
  'sold-out': {
    color: 'var(--accent)',
    bg: 'color-mix(in oklab, var(--accent) 8%, transparent)',
    bgStrong: 'color-mix(in oklab, var(--accent) 14%, transparent)',
    border: 'color-mix(in oklab, var(--accent) 36%, transparent)',
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
} as const;

export type ReportTokenKey = keyof typeof REPORT_TOKENS;
export type ReportToken = (typeof REPORT_TOKENS)[ReportTokenKey];

/** The report family's amber: the result rail, the reported card and the sent stub. */
export const REPORT_AMBER = REPORT_TOKENS.postponed;

/** The report family's mono caps label. Callers add their own size. */
export const REPORT_MONO = {
  fontFamily: 'JetBrains Mono, monospace',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
};
