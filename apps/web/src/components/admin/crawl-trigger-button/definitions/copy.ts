export const copy = {
  button: {
    idle: 'Run crawl now',
    triggering: 'Starting…',
    polling: 'Crawling…',
  },
  status: {
    initiating: 'Initiating crawl…',
    waiting: 'Waiting for result…',
  },
  result: {
    heading: 'Last run',
    strategy: 'Strategy',
    eventsFound: 'Events found',
    eventsInserted: 'Events inserted',
    duration: 'Duration',
    completed: 'Completed',
    timeSuffix: 'MT',
    noValue: '—',
  },
  errors: {
    notAuthenticated: 'Not authenticated',
    triggerFailed: 'Failed to trigger crawl',
    pollFailed: 'Polling failed',
  },
} as const
