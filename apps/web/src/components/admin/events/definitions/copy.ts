// Shown on the admin events queue page

export const COPY = {
  tabs: {
    pending: 'Pending',
    lowConf: 'Low conf.',
    duplicates: 'Duplicates',
    approved: 'Approved',
    rejected: 'Rejected',
  },
  filters: {
    allVenues: 'All venues',
    dateRange: 'Date · next 30d',
    source: 'Source · any',
  },
  listHeader: {
    approved: 'approved',
    pending: 'pending',
    sortLabel: 'sort: discovered ↓',
  },
  flags: {
    lowConf: 'low conf.',
    noPrice: 'no price',
  },
  inspector: {
    pendingReview: 'Pending review',
    lowConfidence: 'low confidence',
    extractedEditable: 'extracted (editable)',
    extractedEditing: 'extracted · editing',
    rawSource: 'raw source · llm input',
  },
  vitals: {
    confidence: 'Confidence',
    source: 'Source',
    discovered: 'Discovered',
    priceRange: 'Price range',
  },
  fields: {
    title: 'Title',
    artist: 'Artist',
    venue: 'Venue',
    date: 'Date',
    doors: 'Doors',
    show: 'Show',
    priceLow: 'Price low',
    priceHigh: 'Price high',
    tags: 'Tags',
    addTag: '+ tag',
  },
  actions: {
    reject: 'Reject',
    approve: 'Approve',
    edit: 'Edit',
    savePending: 'Saving…',
    save: 'Save',
    cancel: 'Cancel',
  },
  keyboard: {
    navigate: 'navigate',
    approve: 'approve',
    reject: 'reject',
  },
  bulkActions: {
    eventsSelected: 'events selected',
    approveAll: 'Approve all',
    reject: 'Reject',
    retag: 'Re-tag',
  },
  empty: {
    title: 'Queue is clear.',
    subtitle: 'Every event has been reviewed.',
  },
  noSelection: 'Select an event to review',
  confirms: {
    deleteEvent: 'Delete this event? Cannot be undone.',
  },
  errors: {
    actionFailed: 'Action failed',
    saveFailed: 'Save failed',
  },
} as const
