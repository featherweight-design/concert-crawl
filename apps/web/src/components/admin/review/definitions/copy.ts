// Shown on the admin review page (/admin/review) — event flags queue, bulk actions, price coverage, and pending submissions

export const REVIEW_COPY = {
  eventFlags: {
    panelTitle: 'Event flags',
    queueClearBadge: 'queue clear',
    queueClearHeading: 'Queue is clear.',
    queueClearBody:
      'Every flagged event has been triaged. Next sweep runs at 18:00 MT.',
    selectAll: 'Select all',
    hideNonConcert: 'Hide non-concert',
    needsReview: 'Needs review',
  },

  eventFlagRow: {
    approve: 'Approve',
    reject: 'Reject',
  },

  eventFlagInspector: {
    emptyState: 'Select an event to inspect',
    confidence: 'Confidence',
    llmReasoning: 'LLM Reasoning',
    extraction: 'Extraction',
    rawSource: 'Raw source',
    source: 'Source',
    date: 'Date',
    doors: 'Doors',
    show: 'Show',
    price: 'Price',
    reject: 'Reject',
    editAndApprove: 'Edit & approve',
    approve: 'Approve',
  },

  bulkActionDock: {
    selected: 'selected',
    retag: 'Re-tag',
    rejectAll: '× Reject all',
    approveCount: (count: number) => `✓ Approve ${count}`,
  },

  bulkApproveModal: {
    eyebrow: 'Bulk action',
    heading: (count: number) =>
      `Approve ${count} flagged event${count !== 1 ? 's' : ''}?`,
    subtext:
      "They'll publish to the consumer app immediately. You can undo from the toast for 6s.",
    aboutToApprove: 'About to approve',
    lowConfidenceWarning: (count: number) =>
      `${count} event${count !== 1 ? 's have' : ' has'} confidence below 0.70. Double-check the lowest-confidence rows before approving.`,
    cancel: 'Cancel',
    confirmApprove: (count: number) => `✓ Approve ${count}`,
  },

  bulkApproveConfirm: {
    eyebrow: 'bulk approve',
    heading: (count: number) =>
      `Approve ${count} event${count !== 1 ? 's' : ''}?`,
    extraEvents: (count: number) =>
      `+${count} more event${count !== 1 ? 's' : ''}`,
    warningStrip:
      'These events will be marked as verified and visible to users.',
    cancel: 'Cancel',
    approveAll: 'Approve all',
  },

  bulkToast: {
    approved: (count: number) =>
      `${count} event${count !== 1 ? 's' : ''} approved`,
    undo: 'Undo',
  },

  priceCoverage: {
    panelTitle: 'Price coverage',
    missingOnly: 'Missing only',
    loading: 'Loading…',
    emptyAllPrices: 'All events have prices — nothing missing.',
    emptyNoPrices: 'No upcoming events with price data.',
    columnEvent: 'Event',
    columnVenueDate: 'Venue / Date',
    columnSource: 'Source',
    columnCurrentPrice: 'Current Price',
    columnUpdated: 'Updated',
    sourceCrawled: 'crawled',
    sourceCommunity: 'community',
    sourceNoPrice: 'no price',
    addPrice: '+ Add price',
    addingPriceFor: 'Adding price for',
    priceLow: 'Low',
    priceHigh: 'High',
    vendor: 'Vendor',
    howFound: 'How found',
    buyTickets: 'Buy tickets',
    addingPriceStatus: 'Adding price',
    discard: 'Discard',
    saving: 'Saving…',
    saveChanges: 'Save changes',
    vendorOptions: {
      ticketmaster: 'Ticketmaster',
      axs: 'AXS',
      seatgeek: 'SeatGeek',
      dice: 'DICE',
      eventbrite: 'Eventbrite',
      venueBoxOffice: 'Venue box office',
    },
    howFoundOptions: {
      sawListing: 'Saw listing',
      boughtMyself: 'Bought tickets',
      atTheVenue: 'At the venue',
    },
  },

  pendingSubmissions: {
    panelTitle: 'Community price submissions',
    empty: 'No pending submissions',
    deny: 'Deny',
    approve: 'Approve · award cred',
  },

  reviewPageClient: {
    eyebrow: 'operations · moderation',
    title: 'Review',
    subtitle:
      'Most events auto-approve. This page is where flags and community price submissions land for triage.',
    mobileTitle: 'Review',
    mobileSubtitle: (eventCount: number, submissionCount: number) =>
      `${eventCount} event${eventCount !== 1 ? 's' : ''} · ${submissionCount} price${submissionCount !== 1 ? 's' : ''} waiting.`,
  },

  adminReviewMobile: {
    tabEventFlags: 'Event flags',
    tabPrices: 'Prices',
    queueClearHeading: 'Queue is clear.',
    queueClearBody:
      'Every flagged event has been triaged. Next sweep runs at 18:00 MT.',
    communitySubmissionsHeader: 'Community submissions',
    noSubmissions: 'No pending submissions',
    needsPrice: 'Needs price',
    missingOnly: 'Missing only',
    allHavePrices: 'All events have prices.',
    noUpcomingEvents: 'No upcoming events.',
    llmReasoning: 'LLM reasoning',
    llmDetailsStrategy: 'strategy:',
    llmDetailsConfidence: 'confidence:',
    llmDetailsSource: 'source:',
    buyTickets: 'Buy tickets',
    rejectEvent: '× Reject',
    approveEvent: '✓ Approve',
    denySubmission: '× Deny',
    approveSubmission: '✓ Approve · cred',
    priceLowPlaceholder: 'Low $',
    priceHighPlaceholder: 'High $',
    cancel: 'Cancel',
    saving: 'Saving…',
    save: 'Save',
    vendorOptions: {
      ticketmaster: 'Ticketmaster',
      axs: 'AXS',
      seatgeek: 'SeatGeek',
      dice: 'DICE',
      eventbrite: 'Eventbrite',
      venueBoxOffice: 'Box office',
    },
    howFoundOptions: {
      sawListing: 'Saw listing',
      boughtMyself: 'Bought tickets',
      atTheVenue: 'At the venue',
    },
  },
} as const
