// Shown in the venue list table on the admin venues page (/admin/venues)
export const venueTableClientCopy = {
  empty: 'No venues match the current filter.',
  bulkActions: {
    selected: 'selected',
    verify: 'Verify',
    unverify: 'Unverify',
    activate: 'Activate',
    deactivate: 'Deactivate',
  },
  configuredVenues: 'Configured venues',
  columns: {
    venue: 'Venue',
    sourceUrl: 'Source URL',
    strategy: 'Strategy',
    schedule: 'Schedule',
    status: 'Status',
    health: 'Health',
    lastCrawl: 'Last crawl',
    events: 'Events',
  },
  schedule: 'daily · 3 AM MT',
  expand: {
    expandAriaLabel: 'Expand venue',
    collapseAriaLabel: 'Collapse venue',
  },
  selectAll: 'Select all venues',
  selectVenue: 'Select',
} as const
