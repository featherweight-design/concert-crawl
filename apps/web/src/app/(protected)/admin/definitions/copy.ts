// Shown on the main admin dashboard page (/admin)

export const COPY = {
  statCards: {
    needsReview: 'Needs review',
    needsReviewUnit: 'items',
    llmCost: 'LLM cost · 30d',
    crawlHealth: 'Crawl health',
    crawlHealthUnit: 'green',
    activeVenues: 'Active venues',
  },
  buttons: {
    openReview: 'Open Review',
  },
  panels: {
    crawlHealthToday: 'Crawl health · today',
  },
  attentionItems: {
    crawlBlocked: (venueName: string) => `${venueName} — crawl blocked`,
    crawlFailed: (venueName: string) => `${venueName} — crawl failed`,
    crawlBlockedMeta: 'Venue blocked · crawl schedule paused',
    crawlFailedMeta: (status: string) =>
      `Status: ${status} · check crawl inspector`,
    crawlTimeLabel: 'recent',
    openCrawl: 'Open crawl',
    eventsFlaggedTitle: (count: number) =>
      `${count} event${count === 1 ? '' : 's'} flagged for review`,
    eventsFlaggedMeta: 'Needs manual verification before publishing',
    eventsTimeLabel: 'pending',
    openReview: 'Open Review',
    pricesWaitingTitle: (count: number) =>
      `${count} price submission${count === 1 ? '' : 's'} waiting`,
    pricesMeta: 'Community submissions need approval or dispute',
    pricesTimeLabel: 'pending',
    openPricesReview: 'Open Review',
  },
  summary: {
    venuesNeedAttention: (count: number) =>
      `${count} venue${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} attention`,
    eventsFlagged: (count: number) => `${count} events flagged`,
    pricesWaiting: (count: number) => `${count} price submissions waiting`,
    venuesGreen: (green: number, total: number) =>
      `${green} of ${total} venues green`,
  },
  budget: {
    hint: (budget: number, pct: number) => `Budget $${budget} · ${pct}% used`,
  },
  activeVenues: {
    addedThisWeek: (count: number) => `+${count} this week`,
    venuesOfTotal: (total: number) => `of ${total}`,
  },
} as const
