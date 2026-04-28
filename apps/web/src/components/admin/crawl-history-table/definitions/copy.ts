export const copy = {
  heading: 'Crawl History',
  columns: {
    timestamp: 'Timestamp',
    status: 'Status',
    strategy: 'Strategy',
    eventsFound: 'Found',
    eventsInserted: 'Inserted',
    duration: 'Duration',
    error: 'Error',
  },
  empty: 'No crawl runs yet.',
  noValue: '—',
  timeSuffix: 'MT',
} as const
