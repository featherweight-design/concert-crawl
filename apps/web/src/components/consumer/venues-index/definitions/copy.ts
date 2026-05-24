// Shown on the /venues page — venue cards, filter bar, and empty states

export const VENUES_INDEX_COPY = {
  pageHeading: 'Venues',
  venueCountSuffix: 'in Denver',

  columnHeaders: {
    venue: 'Venue',
    capacity: 'Capacity',
    upcoming: 'Upcoming',
  },

  statLabels: {
    capacity: 'Capacity',
    upcoming: 'Upcoming',
    distance: 'Distance',
    shows: 'shows',
    capacityAbbr: 'cap',
  },

  featureCard: {
    flagship: '★ Flagship',
    directions: 'Directions',
  },

  filterBar: {
    sortPrefix: 'Sort',
    clearMobile: '× Clear',
    clearDesktop: '× Clear filters',
  },

  emptyState: {
    heading: 'No venues match.',
    body: "Loosen a filter or two and they'll come back.",
    clearButton: '× Clear filters',
  },
} as const
