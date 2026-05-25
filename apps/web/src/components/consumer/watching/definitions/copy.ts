// Shown on the Watching page — user's saved shows list

export const COPY = {
  watchingContent: {
    eyebrow: 'WATCHING',
    showsSingular: 'show',
    showsPlural: 'shows',
    priceSummaryHeld: 'prices held',
    priceSummaryDropped: 'dropped',
    priceSummaryUp: 'went up',
    priceSummarySoldOut: 'sold out',
    bucketTonight: 'Tonight',
    bucketThisWeek: 'This week',
    bucketNextWeek: 'Next week',
  },
  watchingItem: {
    removeAriaLabel: (artist: string) => `Remove ${artist} from watching`,
    soldOut: 'SOLD OUT',
    priceTba: 'tba',
    savedPrefix: 'saved',
    savedPricePrefix: 'at $',
    staleTooltip: (relTime: string) =>
      `Last checked ${relTime} — could be stale`,
    stalePrefix: 'Stale · ',
  },
  notifyFutureRow: {
    title: 'Price drop alerts',
    subtitle: 'Coming soon.',
    badge: 'SOON',
  },
} as const
