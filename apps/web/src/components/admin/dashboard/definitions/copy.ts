// Shown on the admin dashboard (/admin) — greeting, stat cards, attention feed, and activity

export const COPY = {
  greeting: {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
  },
  attentionFeed: {
    panelTitle: 'Needs your attention',
    activeSuffix: 'active',
    empty: 'No items need attention right now.',
    viewCrawlLog: 'View crawl log',
  },
  activityFeed: {
    tabs: {
      all: 'All',
      crawl: 'Crawl',
      events: 'Events',
      invites: 'Invites',
    },
    noRecentActivity: 'No recent activity.',
    noActivity: 'No activity yet.',
    crawlOk: (venueName: string) => `${venueName} crawl ok`,
    crawlStatus: (venueName: string, status: string) =>
      `${venueName} crawl ${status}`,
    venueFallback: 'Venue',
  },
  crawlHealthTable: {
    columns: {
      venue: 'Venue',
      status: 'Status',
      lastCrawl: 'Last crawl',
      strategy: 'Strategy',
      events: 'Events',
      cost: 'Cost',
    },
  },
  runHistoryBlocks: {
    lastNRuns: (count: number) => `Last ${count} runs`,
  },
} as const
