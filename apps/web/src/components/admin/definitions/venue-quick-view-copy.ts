// Shown in the venue quick-view panel on the admin venues list
export const venueQuickViewCopy = {
  sections: {
    ticketVendor: 'Ticket vendor',
    crawlSchedule: 'Crawl schedule',
    extractionStrategy: 'Extraction strategy',
    consecutiveFailures: 'Consecutive failures',
    robotsTxt: 'robots.txt',
  },
  crawlSchedule: {
    label: 'daily · 3 AM MT',
    cron: '0 0 3 * * *',
  },
  consecutiveFailures: {
    outOf: 'of 4',
  },
  robots: {
    unchecked: 'unchecked',
    allowed: 'allowed',
    disallowed: 'disallowed',
  },
  actions: {
    runCrawl: 'Run crawl now',
    triggering: 'Triggering…',
    queued: 'Queued ✓',
    error: 'Error — retry?',
    editVenue: 'Edit venue',
    crawlHistory: 'Crawl history',
  },
} as const
