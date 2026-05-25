// Shown on the admin crawl page — venue crawl status table

export const COPY = {
  columns: {
    venue: 'Venue',
    lastCrawl: 'Last Crawl',
    status: 'Status',
    events: 'Events',
    strategy: 'Strategy',
    failures: 'Failures',
  },
  empty: 'No venues found. Add venues in the Venues section.',
  statusLabels: {
    paused: '(paused)',
    blocked: '(blocked)',
    never: 'never',
  },
} as const
