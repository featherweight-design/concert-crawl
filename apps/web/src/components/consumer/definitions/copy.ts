export const copy = {
  emptyTonight: 'No shows tonight, grandpa.',
  emptyDate: (dateLabel: string) => `No shows ${dateLabel}, grandpa.`,
  emptyFiltered: 'Nothing matches those filters.',
  emptyFilteredCta: 'Clear filters',
  loadMore: 'Load more shows',
  ticketsCta: 'Get tickets',
  doorsLabel: 'Doors',
  showLabel: 'Show',
  cancelledLabel: 'Cancelled',
  postponedLabel: 'Postponed',
  freeLabel: 'Free',
  venueUpcoming: 'Upcoming shows',
  venueNoShows: 'No upcoming shows at this venue.',
  heroTonight: 'Tonight',
  heroCommunityPick: 'Community Pick', // Phase 6+ — design the hero slot to accept this label
} as const
