export const CONSUMER_COPY = {
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
    "We haven't found any scheduled shows for this venue yet. Check back soon.",

  // ── Watching ───────────────────────────────────────────────────────
  watchingEmptyEyebrow: 'Watching',
  watchingEmptyTitle: 'No shows, grandpa.',
  watchingEmptyBody:
    "Add a show to follow it. Soon, we'll watch the price for you and notify you of drops, spikes, or sell-outs.",
  watchingEmptyCta: "Browse tonight's shows",

  // ── Search ─────────────────────────────────────────────────────────
  searchNoResultsEyebrow: 'No results',
  searchNoResultsTitle: 'Nothing under that name.',
  searchNoResultsBody:
    "No bookings right now. Try another spelling, or browse what's on tonight.",
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
    floorErrorMax: 'Cap is $2,000.',
    ceilingLabel: 'Ceiling',
    ceilingPlaceholder: '75',
    ceilingErrorMax: 'Cap is $2,000.',
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
      "Ticketing APIs don't share prices with us, and we're not waiting on them. The community fills the gap, so if you saw a number out there, drop it here.",
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
    submittedByPrefix: 'Submitted by',
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

  // ── Submit price modal ──────────────────────────────────────────
  // Shown in the price submission modal, accessible from event detail and watching pages
  submitPrice: {
    modal: {
      ariaLabel: 'Submit price',
      closeAriaLabel: 'Close',
      checkingLabel: 'Checking…',
    },
    header: {
      eyebrow: {
        error: 'Hmm · stalled',
        success: 'Got it · submitted',
        alreadySubmitted: 'Already submitted',
        open: 'Community prices · open',
      },
      code: {
        error: 'ERR',
        success: 'SENT',
        alreadySubmitted: 'DONE',
        open: 'OPEN',
      },
    },
    form: {
      contextEyebrow: 'Submit a price',
      antiabuseNotice:
        'Prices are capped at $2,000. Submissions stay pending until 2 fans confirm.',
      floorLabel: 'Floor',
      floorPlaceholder: '35',
      ceilingLabel: 'Ceiling',
      ceilingPlaceholder: '75',
      tierLabel: 'Tier *',
      vendorLabel: "Where it's listed *",
      howFoundLabel: 'How you found out *',
      footerNote:
        'Anonymous to other fans. Rate-limited at 1 per show per 24h.',
      submitButton: 'Submit price',
    },
    statusRail: {
      errorLabel: "Didn't save · price channel",
      errorCode: 'ERR · 503',
    },
    success: {
      heading: 'Got it.',
      body: 'Your price is pending — two more fans confirming it moves it to confirmed and you get some cred.',
      backButton: 'Back to show',
    },
    error: {
      heading: 'Didn’t go through.',
      networkWithdrawError:
        "Couldn't reach the server — check your connection and try again.",
      apiWithdrawError:
        'Something went wrong withdrawing your submission. Try again or come back later.',
      defaultError:
        "Couldn't reach the server — your inputs are still here. Try again or come back later.",
      tryAgainButton: 'Try again',
      closeButton: 'Close',
    },
    alreadySubmitted: {
      heading: 'Already in.',
      limitNote: 'You can submit one price per show every 24h.',
      editButton: 'Edit submission',
      withdrawButton: 'Withdraw',
    },
  },

  // ── Feedback modal ──────────────────────────────────────────────
  // Shown in the floating feedback tab and modal, accessible from all consumer pages
  feedback: {
    edgeTab: {
      ariaLabel: 'Send feedback',
      label: 'Tell us · beta',
    },
    modal: {
      ariaLabel: 'Feedback',
      closeAriaLabel: 'Close feedback',
      form: {
        heading: 'Holler at ya boi.',
        subheading:
          'Bug, idea, or praise. We read all of it, usually within a couple days.',
        categoryEyebrow: 'What kind?',
        messageEyebrow: "What's up?",
        messagePlaceholder:
          'What did you see? What did you expect? For bugs, please share anything that helps reproduce it.',
        screenshotEyebrow: 'Screenshot (optional)',
        screenshotAttachLabel: 'Attach a screenshot',
        screenshotAttachSublabel: 'Optional · helps a lot',
        screenshotRemoveAriaLabel: 'Remove screenshot',
      },
      categories: {
        bug: 'Bug',
        idea: 'Idea',
        praise: 'Praise',
        other: 'Other',
      },
      errors: {
        categoryRequired: 'Pick a feedback category.',
        messageRequired: "Don't leave us hanging, what's up?",
      },
      footer: {
        cancel: 'Cancel',
        submit: 'Send →',
        submitting: 'Sending…',
      },
      success: {
        heading: 'Loud and clear.',
        body: "Thanks for the feedback! We'll reach out if we need more information.",
        primaryAction: 'Back to the show',
        secondaryAction: 'Send another',
      },
      error: {
        heading: 'Signal lost.',
        body: "We couldn't push that to the queue just now. Your message is saved on this device. Try again in a bit or send it later.",
        primaryAction: 'Try again',
        secondaryAction: 'Save and come back',
      },
      contextDisclosure: {
        toggleLabel: "Auto-attached · what we'll send",
        fieldCount: '5 fields',
        fields: {
          route: 'Route',
          theme: 'Theme',
          build: 'Build',
          device: 'Device',
          user: 'User',
        },
      },
      headerRail: {
        form: 'Beta channel · always open',
        success: 'Got it · beta channel',
        error: 'Beta channel · stalled',
        codeForm: 'OPEN',
        codeSuccess: 'SENT',
        codeError: 'ERR',
      },
      statusRail: {
        successLabel: 'Got it · beta channel',
        errorLabel: "Didn't send · beta channel",
        successCode: '200 · OK',
        errorCode: 'ERR · 503',
      },
    },
  },

  // ── Release notes ───────────────────────────────────────────────
  // Shown in the release notes page, feature drop pill, and spotlight modal — the changelog and feature announcement flow
  releaseNotes: {
    page: {
      eyebrow: 'Transmission log',
      heading: 'What we shipped.',
      description:
        "Everything we've shipped, in one place. Spotted a bug or got an idea?",
      feedbackCta: 'Send us a note',
      endOfLog: '— end of log —',
    },

    entry: {
      liveBadge: 'Live',
      spotlightEyebrow: 'Feature drop · announcement',
      spotlightCta: 'See the announcement',
    },

    modal: {
      closeAriaLabel: 'Close',
      featureDropPrefix: 'Feature drop · ',
      walkthroughLabel: 'How it works',
      stepSeparator: ' / ',
      prevButton: '← Back',
      nextButton: 'Next →',
      stepIndicatorAriaLabel: (stepNumber: number) =>
        `Go to step ${stepNumber}`,
      founderEyebrowFallback: 'Behind the build',
      founderSignFallback: '— Hugh',
      dismissCta: 'Maybe later',
      fallbackCta: 'Got it',
    },

    versionFooter: {
      ariaLabel: 'View changelog',
      unreadLabel: 'What’s new',
      readLabel: 'Changelog',
    },

    featureDropPill: {
      eyebrow: 'Feature drop',
      dismissAriaLabel: 'Dismiss',
    },

    heroes: {
      watchers: {
        watchingNow: 'watching now',
        eyebrow: 'Aggregate · no names',
      },
      history: {
        nightsKept: 'Nights kept',
        eyebrow: 'Every night, every year',
      },
      prices: {
        faceValue: 'Face value',
        verified: 'Verified',
        reportsLabel: 'reports · last 7 days',
        eyebrow: 'Crowd-sourced · verified',
      },
      calendar: {
        syncEyebrow: 'Sync your shows',
      },
      shareable: {
        eyebrow: 'Take it with you',
      },
      spotify: {
        artistsImported: 'Artists imported',
        eyebrow: 'Library, on stage',
      },
      following: {
        followingChip: 'Following',
        newShowAnnounced: '★ New show announced',
        eyebrow: "Following · we'll ping you",
      },
      priceDrop: {
        watchingTrend: 'Watching 14 d · lowest yet',
        eyebrow: 'Watch · alert · save',
      },
      setlist: {
        likelyLabel: 'Likely · last 7',
        setlistHeading: 'SETLIST · TONIGHT',
        tapToSeeMore: 'tap to see full list',
        eyebrow: "What they're playing",
      },
      firstTimer: {
        leftChipLabels: ['ALL AGES', 'DOORS 7PM', 'NO RE-ENTRY'],
        rightChipLabels: ['CASH BAR', '2 DRINKS MIN', 'CASH TIPS'],
        eyebrow: "First time? · here's the sitch",
      },
      lastTime: {
        eyebrow: 'Last time in town',
      },
      supportAct: {
        headlinerRole: 'HEADLINER · 9:00 PM',
        openerRole: '★ OPENING · 8:00 PM',
        newToYouSuffix: 'new to you',
        eyebrow: "Don't miss the opener",
      },
      venuePassport: {
        nightsStamped: 'Nights stamped',
        stampLedger: 'Stamp ledger',
        stampedBadge: 'STAMPED',
        eyebrow: 'The venues you collect',
      },
      passport: {
        passportEyebrow: 'Showtime · every night kept',
      },
      tiers: {
        pickYourSeat: 'Pick your seat',
        firstHundredOnly: 'FIRST 100 ONLY',
      },
      compact: {
        prices: {
          eyebrow: 'Crowd-sourced',
          verifiedLabel: 'Verified',
          faceValue: 'Face value',
        },
        tiers: { eyebrow: 'Founder', firstHundredOnly: 'First 100 only' },
        history: { eyebrow: 'Concert history', nightsKept: 'Nights kept' },
        calendar: { eyebrow: 'Jun 2026' },
        shareable: { eyebrow: 'Share card' },
        watchers: { eyebrow: 'Watching now' },
        spotify: { eyebrow: 'Spotify sync', artistsLabel: 'Artists' },
        following: { eyebrow: 'Following' },
        priceDrop: { eyebrow: 'Price drop' },
        setlist: { eyebrow: 'Setlist' },
        firstTimer: { eyebrow: 'First-Timer' },
        lastTime: { eyebrow: 'Last time' },
        supportAct: { eyebrow: 'Opening for', openerLabel: '★ Opener' },
        passport: { eyebrow: 'Passport' },
        venuePassport: { eyebrow: 'Venue passport' },
      },
    },
  },

  // ── User menu ───────────────────────────────────────────────────
  // Shown in the account dropdown menu (desktop popover + mobile bottom sheet) accessible from the avatar in the top-right corner of the nav.
  userMenu: {
    ariaLabels: {
      accountMenu: 'Account menu',
    },
    identity: {
      badge: 'Beta · founder',
    },
    sections: {
      you: 'You',
      app: 'App',
      operations: 'Operations',
    },
    rows: {
      submittedPrices: 'Submitted prices',
      submittedPricesMeta: (count: number) => `${count} live`,
      theme: 'Theme',
      settings: 'Settings',
      admin: 'Admin',
      signOut: 'Sign out',
    },
  },

  // ── Search ──────────────────────────────────────────────────────
  // Shown in the search bar and search result states across the app
  search: {
    // SearchBar
    searchPlaceholder: 'Search artists, venues…',
    backAriaLabel: 'Back',
    clearSearchAriaLabel: 'Clear search',

    // SearchPalette
    paletteSearchPlaceholder: 'Search artists or venues…',
    paletteClearAriaLabel: 'Clear',
    paletteEscHint: 'esc',
    paletteNavigateHint: 'navigate',
    paletteOpenHint: 'open',

    // SearchDefaultState section headers
    recentSectionLabel: 'Recent',
    popularSectionLabel: 'Popular this week',

    // SearchDefaultState price fallback
    priceNotAnnounced: 'TBA',

    // SearchResultsState section headers (count appended at runtime)
    artistsSectionPrefix: 'Artists',
    venuesSectionPrefix: 'Venues',

    // SearchResultsState venue sub-label
    upcomingShowSingular: 'upcoming show',
    upcomingShowPlural: 'upcoming shows',
  },

  // ── Filter bar ──────────────────────────────────────────────────
  // Shown in the browse page filter bar — date, venue, price, and genre filters
  filterBar: {
    // Heading
    locationLine: 'Denver · This week',
    headingTitle: "What's on?",

    // List/Cal view toggle
    viewList: 'List',
    viewCal: 'Cal',

    // Clear controls
    clearAllFiltersAriaLabel: 'Clear all filters',
    clearFiltersButton: '× Clear filters',
    clearSearchButton: 'Clear search',

    // Filter labels
    whenLabel: 'When',
    whereLabel: 'Where',
    priceLabel: 'How much',
    vibeLabel: 'Vibe',

    // Filter placeholders
    whenPlaceholder: 'Any date',
    wherePlaceholder: 'Any venue',
    pricePlaceholder: 'Any price',
    vibePlaceholder: 'Any vibe',

    // When options
    whenTonight: 'Tonight',
    whenThisWeekend: 'This weekend',
    whenThisWeek: 'This week',
    whenNextWeek: 'Next week',

    // Price options
    priceUnder25: 'Under $25',
    price25to50: '$25 - $50',
    price50Plus: '$50+',
    priceTbd: 'Price TBD',

    // FilterSheet
    filterSheet: {
      closeAriaLabel: 'Close filter sheet',
    },
  },

  // ── App header ──────────────────────────────────────────────────
  // Shown in the top navigation bar on all consumer pages
  appHeader: {
    brand: {
      name: 'concert',
      accent: 'crawl.',
    },
    nav: {
      tabs: [
        { label: 'Browse', href: '/events' },
        { label: 'Venues', href: '/venues' },
        { label: 'Watching', href: '/watching' },
      ] as const,
    },
    search: {
      ariaLabel: 'Search',
      placeholder: 'Search artists or venues…',
      keyboardShortcut: '⌘K',
    },
    mobileProfileEntry: {
      loadErrorLog:
        'MobileProfileEntry: could not load profile, showing anonymous avatar',
    },
  },

  // ── Bottom nav ──────────────────────────────────────────────────
  // Shown in the mobile bottom navigation bar
  bottomNav: {
    nav: {
      ariaLabel: 'Main navigation',
      tabs: [
        { key: 'browse', label: 'browse', href: '/events' },
        { key: 'venues', label: 'venues', href: '/venues' },
        { key: 'watching', label: 'watching', href: '/watching' },
      ] as const,
      profileAriaLabel: 'Profile',
    },
  },

  // ── Watching page ───────────────────────────────────────────────
  // Shown on the Watching page — user's saved shows list
  watching: {
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
  },

  // ── Setlist preview ─────────────────────────────────────────────
  // Shown on the event detail page — setlist preview section
  setlistPreview: {
    sectionLabel: 'Likely setlist',
    songCountSuffix: 'songs',
    encoreLabel: 'Encore',
    moreSuffix: 'more',
    lastPlayedPrefix: 'Last played',
    viaPrefix: 'via',
  },

  // ── Venue profile ───────────────────────────────────────────────
  // Shown on individual venue pages (/venues/:slug)
  venueProfile: {
    backButton: {
      ariaLabel: 'Go back',
    },
  },

  // ── Venues index ────────────────────────────────────────────────
  // Shown on the /venues page — venue cards, filter bar, and empty states
  venuesIndex: {
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
      body: "Drop a filter or two and they'll come back.",
      clearButton: '× Clear filters',
    },
  },

  // ── Watch show button ───────────────────────────────────────────
  // Shown on event cards and the event detail page — the primary CTA to watch/unwatch a show
  watchShowButton: {
    button: {
      watchLabel: 'Watch this show',
      watchingLabel: 'Watching',
      ariaWatch: 'Watch this show',
      ariaWatching: 'Watching, click to stop',
    },
    watchingCount: {
      suffix: 'watching',
      alertsSuffix: ' · alerts on price + sold out',
    },
  },

  // ── Small event row ─────────────────────────────────────────────
  // Shown in venue pages and watching lists — compact event row
  smallEventRow: {
    priceNotAnnounced: 'tba',
  },

  // ── Event detail ────────────────────────────────────────────────
  // Shown on the event detail page
  eventDetail: {
    backAriaLabel: 'Back to browse',

    // Info row labels
    venueLabel: 'Venue',
    dateLabel: 'Date',
    doorsShowLabel: 'Doors / Show',
    agesLabel: 'Ages',
    allAges: 'All Ages',

    // Primary CTA
    getTickets: 'Get Tickets',
    visitVenueWebsite: 'Visit Venue Website',
    noTicketsAvailable: 'No tickets available',
    noTicketsAriaLabel: 'No tickets available',
    soldOut: 'Sold out',
    soldOutAriaLabel: 'Sold out',

    // About section
    aboutLabel: 'About',

    // Status banners
    cancelledLabel: 'Cancelled',
    postponedLabel: 'Postponed',
    cancelledBody: 'This show has been cancelled.',
    postponedBody: 'This show has been postponed. Check back for updates.',

    // Related shows section — count appended at runtime
    moreAtVenuePrefix: 'More at',
    showSingular: 'show',
    showPlural: 'shows',
  },

  // ── Venues page ─────────────────────────────────────────────────
  // Shown on the venues listing page
  venuesPage: {
    pageTitle: 'Venues',
    zeroCountLabel: '0 in Denver',

    // Empty state
    emptyEyebrow: 'No venues',
    emptyTitle: 'Nothing here yet',
    emptyBody: "Venues will appear here once they're added.",
  },

  // ── Error page ──────────────────────────────────────────────────
  // Shown on error pages within the protected app shell
  error: {
    errorHeading: 'Something went wrong',
    errorBody:
      'An error occurred loading this page. Try again, or sign out and back in.',
    tryAgainButton: 'Try again',
    signOutButton: 'Sign out',
  },

  // ── PendingCardB ────────────────────────────────────────────────
  // Shown on the event detail page — pending price card for community and box-office tiers
  pendingCardB: {
    // Strip left group
    pending: 'Pending',
    of: 'of',
    confirmed: 'confirmed',
    // Strip right side: "{N} to go"
    toGo: 'to go',
    // Eyebrow labels
    boxOfficeLabel: 'Box office',
    ticketsLabel: 'Tickets',
    // "Face value · no fees" line (box-office only)
    faceValueNoFees: 'face value · no fees',
    // Vendor line prefix
    seenOnPrefix: 'seen on',
    // Attribution line
    submittedByPrefix: 'Submitted by',
    you: 'you',
    anonymousFan: 'an anonymous fan',
    // Footer — other view
    confirmPrice: 'Confirm price',
    sawDifferentNumber: 'Saw a different number?',
    // Footer — self-locked view
    yourSubmissionLabel: 'Your submission',
    waitingOnOneFan: 'Waiting on one more fan',
    // Footer — submitter view
    editButton: 'Edit',
    withdrawButton: 'Withdraw',
  },

  // ── Settings ────────────────────────────────────────────────────
  settings: {
    anonymousLabel: 'anonymous fan',
    anonymousExplainer:
      "You're browsing as an anonymous fan. Pick a handle to get credit for your price submissions (it applies retroactively).",
    goingAnonymousWarning:
      'Clearing your handle makes you anonymous again. You may lose your handle and your past submissions will no longer show your name.',
    handlePlaceholder: 'lowercase_handle',
    handleHint: 'Lowercase letters, numbers, underscores. 3–20 characters.',
    handleErrors: {
      tooShort: 'Handle must be at least 3 characters.',
      invalidChars: 'Only lowercase letters, numbers, and underscores.',
      reserved: 'That handle is reserved.',
      taken: 'That handle is taken.',
    },
    cityPlaceholder: 'Denver',
    cityHint: 'Never shown publicly.',
    planCard: {
      founder: {
        badge: 'Founder',
        yourPlanLabel: 'Your plan',
        tagline: 'Free for life.',
        body: 'You showed up during the private beta, so you keep Concert Crawl free, forever. No card needed.',
        subline: 'Yes, even when we charge new users.',
      },
      paid: {
        badge: 'Supporter',
        tagline: 'Supporting Concert Crawl.',
        subline: 'Thank you.',
      },
      trial: {
        badge: 'Trial',
        tagline: 'days remaining',
        subline: 'Upgrade to keep your access.',
      },
      pastDue: {
        badge: 'Past due',
        tagline: 'Payment failed.',
        cta: 'Update billing →',
      },
    },
    dangerZone: {
      signOut: 'Sign out',
      signOutSubtitle: "Burn your tokens. We'll remember you.",
      deleteAccount: 'Delete account',
      deleteAccountSubtitle:
        'Permanently remove your handle, profile, and history.',
      deleteCardBody:
        "This is permanent. Your handle, email, and plan are gone. Price submissions stay on the public record, but your name is removed from them. You can't undo deletion.",
      deleteAccountCta: 'Delete my account',
      deleteSheetTitle: 'Delete account permanently',
      deleteSheetBody:
        "Your handle and profile will be gone. Price submissions you made will stay (they're part of the public record), but your name will be removed from them. Other fans' confirmations belong to them and will persist.",
      deleteConfirmPlaceholder: 'Type DELETE to enable',
      deleteButtonArmed: 'Delete my account permanently',
      deleteButtonDisabled: 'Type DELETE to enable',
    },
    planSection: 'Your plan',
    appearanceSection: 'Appearance',
    accountSection: 'Account',
    submissionsSection: 'My submissions',
    listsSection: 'Lists',
    dangerSection: 'Danger zone',
    seeAllSubmissions: (submissionCount: number) =>
      `See all ${submissionCount} →`,
    emailRow: 'Email',
    connectedAccountRow: 'Connected Account',
    passwordRow: 'Password',
    clerkLinkLabel: 'Manage via Clerk →',
    watchlistRow: 'Saved shows',
    watchlistComingSoon: 'Coming soon',
  },

  // ── Multi-tier price display ────────────────────────────────────
  // Shared copy for TierAlternateRow, MultiTierLiveCard, MixedTierCard, TwoPendingStack
  multiTier: {
    // TierAlternateRow — pending middle column: "pending · {confirms}/{needed}"
    pendingTemplate: (confirms: number, needed: number) =>
      `pending · ${confirms}/${needed}`,
    // MultiTierLiveCard / MixedTierCard — price card top label
    fromLabel: 'from',
    // MultiTierLiveCard / MixedTierCard — alternate tiers section header
    otherTiersEyebrow: 'Other tiers',
  },

  // ── CorroborationSheet ──────────────────────────────────────────
  // Bottom sheet for confirming a pending price submission
  corroborationSheet: {
    eyebrow: 'Confirm price',
    cancelButton: 'Cancel',
    heading: (floor: number, ceiling?: number) =>
      ceiling != null && ceiling > floor
        ? `Did you also see $${floor}–$${ceiling}?`
        : `Did you also see $${floor}?`,
    subtitle:
      "Two fan confirms moves a price from pending to live. Pick how you checked — we're trying to keep this honest, not fast.",

    // VerifyOption labels and descriptions
    options: {
      sameVendor: {
        label: (vendor: string) => `Same vendor (${vendor})`,
        description: (vendor: string) =>
          `I just checked ${vendor} and saw the same number.`,
        boxOfficeLabel: 'Venue box office',
        boxOfficeDescription:
          'I also checked the venue box office and saw the same price.',
      },
      otherVendor: {
        label: 'A different vendor / site',
        description: 'I checked another ticketing site and the number matches.',
      },
      sawListing: {
        label: 'Saw the price at the box office',
        description:
          'In person or by phone. Counts as a community confirm with box-office origin.',
      },
      boughtMyself: {
        label: 'Bought a ticket at the box office',
        description:
          'Confirms this submission AND opens a separate gold-tier box-office submission for your purchase.',
      },
    },

    // Confirm CTA
    confirmButton: 'Confirm — same number',

    // Escape link
    escapeLink:
      'Saw a different tier or a different price? Submit an update instead.',

    // Honesty disclaimer shown at bottom of verify options
    honestyDisclaimer:
      'Confirming is a community action — only confirm if you actually checked the price.',

    // Self-locked state
    selfLocked: {
      waitingNotice:
        "Your submission is pending. You can't confirm your own price — but 2 other fans can.",
      editButton: 'Edit submission',
      withdrawButton: 'Withdraw',
    },

    // SubmissionDetailCard labels
    vendorLabel: 'VENDOR',
    byLabel: 'BY',
    whenLabel: 'WHEN',
    viaAnonymous: 'anonymous',
    viaHandlePrefix: '@',
  },

  // ── DisputedPriceCard ───────────────────────────────────────────
  // Card showing a live price with a pending counter-submission against it
  disputedPriceCard: {
    strip: {
      badgeLabel: 'update pending',
      sawVerb: 'saw',
      anonymousLabel: 'anonymous',
    },
    body: {
      ticketsLabel: 'Tickets',
      seenOnPrefix: 'seen on',
      submittedByPrefix: 'Submitted by',
      fansConfirmed: (count: number) => `${count} fans confirmed`,
    },
    footer: {
      preButtonCopy: 'Got a different number?',
      buttonLabel: 'Submit an update',
    },
  },

  // ── CounterSubmitSheet ──────────────────────────────────────────
  // Bottom sheet for submitting a counter/update to an existing price submission
  counterSubmitSheet: {
    eyebrow: 'Price update',
    heading: 'Update the price.',
    subtitleWithRange: (floor: number, ceiling: number, vendor: string) =>
      `Currently listed: $${floor}–$${ceiling} on ${vendor}. Your update goes pending until another fan confirms.`,
    subtitleFloorOnly: (floor: number, vendor: string) =>
      `Currently listed: $${floor} on ${vendor}. Your update goes pending until another fan confirms.`,
    floorLabel: 'Floor price',
    floorPlaceholder: '35',
    ceilingLabel: 'Ceiling price (optional)',
    ceilingPlaceholder: '75',
    tierLabel: 'Tier *',
    vendorLabel: "Where it's listed *",
    howFoundLabel: 'How you found out *',
    ceilingHint: 'Optional. Helps fans know the full price range.',
    honestyDisclaimer: 'By submitting, you confirm this is accurate.',
    footerDisclaimer: 'Your update goes pending until another fan confirms.',
    submitButton: 'Submit update',
    submittingButton: 'Submitting…',
    cancelButton: 'Cancel',
    successHeading: 'Update submitted.',
    successBody:
      'Your update is pending — one more fan confirming it moves it forward.',
    successBackButton: 'Back to show',
    errorHeading: "Didn't go through.",
    errorBody:
      "Couldn't reach the server — your inputs are still here. Try again or come back later.",
    errorTryAgainButton: 'Try again',
    errorCloseButton: 'Close',
  },
} as const
