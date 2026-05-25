export const copy = {
  // ── Browse — no-data (tonight / no filter active) ──────────────────
  emptyTonightEyebrow: 'Tonight',
  emptyTonightTitle: 'No shows tonight, grandpa.',
  emptyTonightBody:
    'Slow night on the calendar. Browse the rest of the week, things usually pick up by the weekend.',
  emptyTonightCta: 'View this week',

  // ── Browse — filtered (filter active, zero results) ────────────────
  emptyFilteredEyebrow: 'Filtered',
  emptyFilteredTitle: 'Crickets.',
  emptyFilteredBody:
    'Nothing found with these filters. Drop one, or stretch the dates and try again.',
  emptyFilteredCta: 'Clear filters',

  // ── Browse — calendar (selected day has no events) ─────────────────
  emptyCalEyebrow: 'No shows',
  emptyCalTitle: 'Nothing on this day.',
  emptyCalBody: 'Try a different day or drop a filter.',

  // ── Venue ──────────────────────────────────────────────────────────
  venueEmptyEyebrow: 'Upcoming',
  venueEmptyTitle: 'Nothing booked yet.',
  venueNoShows:
    'We haven’t found any scheduled shows for this venue yet. Check back soon.',

  // ── Watching ───────────────────────────────────────────────────────
  watchingEmptyEyebrow: 'Watching',
  watchingEmptyTitle: 'No shows, grandpa.',
  watchingEmptyBody:
    'Add a show to follow it. Soon, we’ll watch the price for you and notify you of drops, spikes, or sell-outs.',
  watchingEmptyCta: "Browse tonight's shows",

  // ── Search ─────────────────────────────────────────────────────────
  searchNoResultsEyebrow: 'No results',
  searchNoResultsTitle: 'Nothing under that name.',
  searchNoResultsBody:
    'No bookings right now. Try another spelling, or browse what’s on tonight.',
  searchNoResultsCta: 'Browse all shows',

  // ── Shared / misc ──────────────────────────────────────────────────
  loadMore: 'Load more shows',
  ticketsCta: 'Get tickets',
  doorsLabel: 'Doors',
  showLabel: 'Show',
  cancelledLabel: 'Cancelled',
  postponedLabel: 'Postponed',
  freeLabel: 'Free',
  venueUpcoming: 'Upcoming shows',
  heroTonight: 'Tonight',
  heroCommunityPick: 'Community Pick',

  // ── Dispute form ───────────────────────────────────────────────────
  disputeForm: {
    heading: 'What did you see instead?',
    subheading:
      'Disputes have to come with a price and a vendor. Keeps it honest.',
    floorLabel: 'Floor',
    floorPlaceholder: '35',
    floorErrorMin: 'Has to be at least $1.',
    floorErrorMax: 'Cap is $2000.',
    ceilingLabel: 'Ceiling',
    ceilingPlaceholder: '75',
    ceilingErrorMax: 'Cap is $2000.',
    ceilingErrorBelowFloor: "Ceiling can't be below floor.",
    vendorLabel: "Where it's listed *",
    vendorError: "Pick where it's listed.",
    authError: 'You must be signed in to file a dispute.',
    genericError: 'Something went wrong.',
    cancelButton: 'Cancel',
    submitButton: 'File dispute',
    submittingButton: 'Filing…',
    successTitle: 'Logged.',
    successBody: 'Your alternate price will show up alongside this one.',
    successCta: 'Back to show',
  },

  // ── Verify sheet ───────────────────────────────────────────────────
  verifySheet: {
    instructions:
      'Confirm what you saw, dispute what looks off. Two confirms move a price out of pending.',
    closeButton: 'Close',
  },

  // ── Submit price card CTA ──────────────────────────────────────────
  submitPriceCardCta: {
    heading: 'Saw a different price?',
    subheading: 'Two confirms move a community price out of pending.',
    ctaLabel: 'Submit',
  },

  // ── Sold out CTA ───────────────────────────────────────────────────
  soldOutCta: {
    label: 'Sold out',
    ariaLabel: 'Sold out',
  },

  // ── PriceDisplay ────────────────────────────────────────────────
  // Shown on the event detail page — price card and community handoff card
  priceDisplay: {
    // Community handoff card (no price)
    communityBadge: 'community',
    ticketsLabel: 'Tickets',
    noPriceYet: 'No price yet.',
    yourCall: 'Your call.',
    communityGapBody:
      'Ticketing APIs don’t share prices with us, and we’re not waiting on them. The community fills the gap — if you saw a number out there, drop it here.',
    submitPriceButton: 'Submit a price',
    anonymousWorksHint: 'Anonymous works · two confirms moves it live',

    // Price card top label
    boxOfficeLabel: 'Box office',

    // Headline qualifiers
    faceValueNoFees: 'face value · no fees',
    startingAllIn: 'starting, all-in',
    allIn: 'all-in',
    faceValue: 'face value',

    // Sold-out pill
    soldOutPill: 'Sold out',

    // Fee breakdown
    faceValueRow: 'Face value',
    allInIncludingFees: 'all-in, including fees',

    // Alternate sources section
    orPayForConvenience: 'Or pay for convenience',
    allInSuffix: 'all-in',

    // Trust mark labels
    resaleLabel: 'resale',
    communityLabel: 'community',
    boxOfficeTrustLabel: 'box office',
    vendorLabel: 'vendor',

    // Delta pill
    cheaperThanOnSale: 'cheaper than on-sale',
    sinceOnSale: 'since on-sale',

    // Box office attribution verbs
    boughtVerb: 'Bought',
    sawVerb: 'Saw',
    anonymousFan: 'an anonymous fan',
    byPhoneSuffix: '· by phone',

    // Community observation labels
    calledVerb: 'Called',
    byPhoneObservation: 'by phone',
    inPersonObservation: 'in person',

    // Sold out reporter
    reportedSoldOutBy: 'Reported sold out by',
    reportedSoldOut: 'Reported sold out',
    fansConfirmedSuffix: 'fans confirmed',
    fanConfirmedSuffix: 'fan confirmed',
  },

  // ── CommunityPriceChip ──────────────────────────────────────────
  // Shown on the event detail page — community price summary chip
  communityPriceChip: {
    communityBadge: 'community',
    confirmedBadge: 'confirmed',
    pendingBadge: 'pending',
    seenOnPrefix: 'seen on',
    submittedByPrefix: 'Submitted by',
    fanSingular: 'fan',
    fanPlural: 'fans',
    sawTheSame: 'Saw the same',
    reportSingular: 'report',
    reportPlural: 'reports',
  },

  // ── SubmissionList ──────────────────────────────────────────────
  // Shown on the event detail page — list of community price submissions
  submissionList: {
    confirmedBadge: 'confirmed',
    pendingBadge: 'pending',
    youBadge: 'you',
    seenOnPrefix: 'seen on',
    confirmingLabel: 'Confirming…',
    confirmButton: 'Confirm',
    disputeButton: 'Dispute',
    noSubmissions: 'No submissions yet.',
  },
} as const
