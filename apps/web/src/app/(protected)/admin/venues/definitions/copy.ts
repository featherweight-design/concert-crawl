// Shown on the admin venues list page

export const COPY = {
  page: {
    title: 'Venues',
    subtitle: (total: number, blocked: number) =>
      `${total} configured · ${blocked} blocked.`,
    robotsAuditButton: 'robots.txt audit',
  },
  stats: {
    totalVenues: 'Total venues',
    active: 'Active',
    pausedBlocked: 'Paused / Blocked',
    avgHealth: 'Avg health · 7d',
    avgHealthHint: 'average run success rate',
  },
} as const
