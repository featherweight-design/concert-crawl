export const CONSUMER_COPY = {
  // Shared date-group heading used by the calendar, events list and venue
  // event list. All three render the same count, so it lives in one place.
  showCount: (count: number) => `${count} show${count !== 1 ? 's' : ''}`,

  // ── Shared price-card eyebrow ──────────────────────────────────────
  // The uppercase label above the price on every price-card variant
  // (SoldOutPriceCard, MixedTierCard, MultiTierLiveCard, PendingSoldOutCard).
  // One constant so the four cards can't drift apart.
  ticketsEyebrow: 'Tickets',

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

  // ── Calendar jump picker (#642) ────────────────────────────────────
  jumpPickerCueSuffix: 'Jump to a date',
  jumpPickerDialogPrefix: 'Jump to a date',
  jumpPickerFooterHint: 'Dots = shows on sale',
  jumpPickerEmptyPrefix: 'Crickets in',
  jumpPickerEmptySuffix: 'Try later.',
  jumpPickerToday: 'Today',
  jumpPickerClose: 'Close date picker',
  jumpPickerPrevMonth: 'Previous month',
  jumpPickerNextMonth: 'Next month',
  jumpPickerPrevWeek: 'Previous week',
  jumpPickerNextWeek: 'Next week',
  // ── "Back to Today" surface control (#1006) ────────────────────────
  backToTodayLabel: 'Today',
  backToTodayAriaPrefix: 'Back to today',
  // Screen-reader-only cue appended to a WeekStrip day when it has shows on
  // sale (the visible dot indicator is aria-hidden).
  weekStripDayShows: 'shows on sale',

  // ── Venue ──────────────────────────────────────────────────────────
  // Venue profile header — map link and the about-section eyebrow.
  venueProfile: {
    directionsLink: 'Directions',
    aboutEyebrow: 'About',
  },
  venueEmptyEyebrow: 'Upcoming',
  venueEmptyTitle: 'Nothing booked yet.',
  venueNoShows:
    "We haven't found any scheduled shows for this venue yet. Check back soon.",

  // ── Venue first-timer guide (#764) ─────────────────────────────────
  venueGuide: {
    sectionTitle: 'Before you go',
    sectionEyebrow: 'First-timer guide',
    calloutEyebrow: 'New here',
    callout: {
      question: (venueShortName: string) => `First time at ${venueShortName}?`,
      populatedSub: 'Two minutes of stuff worth knowing before you walk in.',
      thinSub: "Here's what we've got so far.",
    },
    eventChip: (venueShortName: string) =>
      `First time at ${venueShortName}? Guide`,
    eventChipArrow: '→',
    insiderTipEyebrow: 'Insider tip',
    accessibilityNotDocumented: 'NOT DOCUMENTED',
    accessibilityPlaceholder:
      'Not documented yet. Worth calling the venue before you head out.',
    // Lowercased here rather than at the call site — the labels are sentence
    // openers elsewhere, and none of them is a proper noun.
    stillGathering: (chipLabels: string[]) =>
      `Still gathering: ${chipLabels.map((label) => label.toLowerCase()).join(', ')}.`,
    thinFooter: (venueShortName: string) =>
      `That's the lot for now. ${venueShortName}'s new to us.`,
    // Returner — collapsed by default for someone who has already been to the
    // room, so the guide stays one tap away without taking the page over.
    returner: {
      // `sectionEyebrow` would label the one card a returner can see with the
      // reason it isn't for them. Same guide, state-neutral name.
      eyebrow: 'Venue guide',
      /**
       * Collapsed: the topics inside, so the tap is an informed one. The bare
       * `+N` is deliberate — at 390px the strip truncates, and spelling out
       * "+N more" clips the number it was meant to clarify.
       */
      preview: (chipLabels: string[], extraCount: number) =>
        `${chipLabels.join(' · ')}${extraCount > 0 ? ` +${extraCount}` : ''}`,
      /** Expanded: the strip has nothing left to preview, so it says why. */
      expandedSummary: 'The stuff worth knowing before you walk in',
      toggleAriaLabel: 'Venue guide',
      collapseLabel: 'Hide the guide',
    },
    chipLabels: {
      accessibility: 'Accessibility',
      parking: 'Parking',
      age_policy: 'Age policy',
      bag_check: 'Bag check',
      coat_check: 'Coat check',
      will_call: 'Will-call / entry',
      food_drink: 'Food + drink',
      transit: 'Getting there',
    },
  },

  // ── Watching ───────────────────────────────────────────────────────
  watchingEmptyTitle: 'No shows, grandpa.',
  watchingEmptyBody:
    'Watch a show and it lands here. We track the price from then on.',
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

  // ── Price-update form ──────────────────────────────────────────────
  disputeForm: {
    heading: 'What did you see instead?',
    subheading:
      'Updates have to come with a price and a vendor. Keeps it honest.',
    floorLabel: 'Floor',
    floorPlaceholder: '35',
    floorErrorMin: 'Has to be at least $1.',
    floorErrorMax: 'Cap is $2,000.',
    ceilingLabel: 'Ceiling',
    ceilingPlaceholder: '75',
    ceilingErrorMax: 'Cap is $2,000.',
    ceilingErrorBelowFloor: "Ceiling can't be below floor.",
    vendorError: "Pick where it's listed.",
    authError: 'You must be signed in to update a price.',
    genericError: 'Something went wrong.',
    cancelButton: 'Cancel',
    submitButton: 'Submit update',
    submittingButton: 'Submitting…',
    successTitle: 'Logged.',
    successBody: 'Your alternate price will show up alongside this one.',
    successCta: 'Back to show',
  },

  // ── Verify sheet ───────────────────────────────────────────────────
  verifySheet: {
    instructions:
      'Confirm what you saw, update what looks off. Two confirms move a price out of pending.',
    closeButton: 'Close',
  },

  // ── Submit price card CTA ──────────────────────────────────────────
  submitPriceCardCta: {
    heading: 'Submit another price',
    subheading: 'Prices are confirmed by the community before they go live.',
    ctaLabel: 'Submit',
    // The gate is announced, not drawn (#1247): signed out, the card looks
    // identical and only the accessible name carries the invitation.
    ariaSignedOut: 'Submit another price: sign up to submit',
  },

  // ── Sold out CTA ───────────────────────────────────────────────────
  soldOutCta: {
    label: 'Sold out',
    ariaLabel: 'Sold out',
  },

  // ── PriceDisplay ────────────────────────────────────────────────
  // Shown on the event detail page — price card and community handoff card
  priceDisplay: {
    // Sentence fragments that wrap an interpolated value (handle, venue,
    // amount). They read as partial sentences on their own; that is why they
    // are functions rather than bare strings.
    attribution: 'by',
    feesToggle: (fees: string) => `+${fees} fees`,
    boxOfficeSource: (prep: string, venueName: string) =>
      `${prep} ${venueName} box office`,

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
    disputeButton: 'Update',
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
      body: 'Your price is pending. Two more fans confirming it moves it to confirmed and you get some cred.',
      backButton: 'Back to show',
    },
    error: {
      heading: 'Didn’t go through.',
      networkWithdrawError:
        "Couldn't reach the server. Check your connection and try again.",
      apiWithdrawError:
        'Something went wrong withdrawing your submission. Try again or come back later.',
      defaultError:
        "Couldn't reach the server. Your inputs are still here. Try again or come back later.",
      tryAgainButton: 'Try again',
      closeButton: 'Close',
    },
    alreadySubmitted: {
      heading: 'Already in.',
      limitNote: 'You can submit up to three times per show every 24h.',
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
        body: "Thanks. We'll reach out if we need more.",
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
      draftBanner: {
        message: 'Saved draft restored.',
        discardLabel: 'Discard draft',
        discardAriaLabel: 'Discard saved draft',
        saveFailed:
          "Couldn't save your draft. Your text is still here. Try sending now, or save again.",
      },
    },
  },

  // ── Release notes ───────────────────────────────────────────────
  // Shown in the release notes page, feature drop pill, and spotlight modal — the changelog and feature announcement flow
  releaseNotes: {
    page: {
      eyebrow: 'Transmission log',
      heading: 'What we shipped.',
      description: "Everything we've shipped. Spotted a bug or got an idea?",
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
      accountMenuSignedOut: 'Account menu: sign up or sign in',
      menuTitle: 'Account',
      // #737: the pip is a DOT, never a count — the number is announced here
      // instead. Used by the desktop avatar trigger AND bottom-nav slot 4, so
      // both account affordances name the same thing the same way.
      accountMenuUnread: (count: number): string =>
        `Account menu, ${count} unread ${
          count === 1 ? 'notification' : 'notifications'
        }`,
      /** Polite live-region text, announced when the unread count changes. */
      unreadAnnouncement: (count: number): string =>
        `${count} unread ${count === 1 ? 'notification' : 'notifications'}`,
    },
    identity: {
      badge: 'Beta · founder',
    },
    signedOut: {
      eyebrow: 'NOT SIGNED IN',
      line: 'Browsing as a guest',
      signUp: 'Sign up free',
      signUpHref: '/sign-up',
      alreadyHaveAccount: 'Already have an account?',
      signIn: 'Sign in',
      signInHref: '/sign-in',
      howItWorks: 'How Concert Crawl works',
      howItWorksHref: '/onboarding',
      terms: 'Terms',
      termsHref: '/legal/terms',
      privacy: 'Privacy',
      privacyHref: '/legal/privacy',
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
    // #1115 PR-G — artists that have their own page. A separate section from
    // the event-derived "Artists" rows above, which route to a filtered browse.
    artistPagesSectionPrefix: 'Artist pages',

    // SearchResultsState venue sub-label
    upcomingShowSingular: 'upcoming show',
    upcomingShowPlural: 'upcoming shows',

    // SearchResultsState artist-page row — sub-label when the artist has a page
    // but nothing on the calendar, and the trailing tag on every such row.
    artistPageNoUpcoming: 'Past shows only',
    artistPageRowTag: 'Artist page',
  },

  // ── Filter bar ──────────────────────────────────────────────────
  // Shown in the browse page filter bar — date, venue, price, and genre filters
  filterBar: {
    // Heading
    locationLine: 'Denver',
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
        // "My shows" is the container for Watching + History + Artists; the
        // href stays /watching because that is still the default landing
        // sub-tab.
        {
          label: 'My shows',
          href: '/watching',
          matchPrefixes: ['/history', '/following'],
        },
        { label: 'Crews', href: '/crews' },
      ] as const,
    },
    search: {
      ariaLabel: 'Search',
      placeholder: 'Search artists or venues…',
      keyboardShortcut: '⌘K',
    },
    auth: {
      signIn: 'Sign in',
      signInHref: '/sign-in',
      signUp: 'Sign up',
      signUpHref: '/sign-up',
    },
    anonDisc: {
      testId: 'anon-disc',
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
        {
          key: 'watching',
          label: 'my shows',
          href: '/watching',
          matchPrefixes: ['/history', '/following'],
        },
        { key: 'crews', label: 'crews', href: '/crews' },
      ] as const,
      // Slot 5's accessible name comes from userMenu.ariaLabels — it opens the
      // same menu as every other account trigger, so it names the same thing.
    },
  },

  // ── Watching page ───────────────────────────────────────────────
  // Shown on the Watching page — the shows a user is watching
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
      stalePrefix: 'Stale · ',
    },
    // DeltaTag — the "no meaningful change since you saved" reading. The
    // drop/spike readings are formatted numbers, not copy.
    sourcePill: {
      boxofficeLabel: 'Box office',
      boxofficeTooltip: 'Box office price straight from the venue',
      standardLabel: 'Community',
      standardTooltip: 'Community price, submitted by a fan',
      resaleLabel: 'Resale',
      resaleTooltip: 'Resale price from the secondary market, not face value',
    },
    // The signed-out teaching state. Distinct from `watchingEmpty*` above,
    // which is the signed-in "no shows yet" state for a different person.
    signedOut: {
      eyebrow: 'WATCHING',
      title: 'Keep an eye on it.',
      lede:
        "Watching is your shortlist of shows you don't want to miss, and a " +
        'price tracker on each one. Nothing to set up. It just needs an ' +
        'account to save to.',
      exampleAlt:
        'Example: a Watching list showing three shows, one with a ' +
        'seven-dollar price drop.',
      exampleRows: [
        {
          artist: 'Geese',
          meta: 'Ogden · Tonight · 9:00 PM',
          price: '$25',
          delta: '−$7',
          tone: 'var(--success)',
        },
        {
          artist: 'Wednesday',
          meta: 'Mission · Tue · 8:00 PM',
          price: '$30',
          delta: 'flat',
          tone: 'var(--fg-subtle)',
        },
        {
          artist: 'Bright Eyes',
          meta: 'Red Rocks · May 6 · 7:00 PM',
          price: '—',
          delta: 'SOLD OUT',
          tone: 'var(--warning)',
        },
      ],
      facts: [
        {
          key: '01',
          title: 'The eye is the whole gesture.',
          body: 'Tap it on any show, from a card or the detail page, and it lands here.',
        },
        {
          key: '02',
          title: 'We watch the price, not you.',
          body:
            'Drops, spikes, and sell-outs show up against what it cost when ' +
            'you started watching.',
        },
        {
          key: '03',
          title: 'Free, and it stays free.',
          body: 'Watching is on the Free tier. No card, no trial.',
        },
      ],
      signUp: 'Sign up free',
      signUpHref: '/sign-up',
      alreadyHaveAccount: 'Already have an account?',
      signIn: 'Sign in',
      signInHref: '/sign-in',
      keepBrowsing: 'OR KEEP BROWSING →',
      keepBrowsingHref: '/events',
    },
  },

  // ── Setlist preview ─────────────────────────────────────────────
  // Shown on the event detail page — setlist preview section
  setlistPreview: {
    // Encore rows are numbered E1, E2… against the main-set numbering
    encoreNumber: (position: number) => `E${position}`,
    sectionLabel: 'Likely setlist',
    songCountSuffix: 'songs',
    encoreLabel: 'Encore',
    moreSuffix: 'more',
    lastPlayedPrefix: 'Last played',
    viaPrefix: 'via',
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
      ariaWatch: 'Watch this show',
      ariaWatching: 'Watching, click to stop',
      // Signed out the eye opens the tier picker, so the name states that
      // outcome. No visible word is added — the pixels are identical to
      // signed-in-at-rest, and only the accessible name differs.
      ariaWatchSignedOut: (artist: string) =>
        `Watch ${artist}: sign up to start watching`,
      // Used when the calling surface has no artist name in scope (WatchZone).
      thisShowFallback: 'this show',
    },
  },

  // ── Post-signup return seam ─────────────────────────────────────
  // The strip that explains an action replayed while the visitor was signing up.
  // "Kept", never "Saved" — there is no Saved concept in this product.
  returnSeam: {
    heading: (artist: string) => `Now watching ${artist}.`,
    subline: 'Kept while you were signing up',
    viewLink: 'View',
  },

  // ── Who else is watching ────────────────────────────────────────
  // The social-proof surface under the Watch button on event detail (#762).
  // "in the crawl" is the warm handle for "other Concert Crawl users" — never
  // "users", never "event".
  watchers: {
    loading: 'Counting the crawl…',
    // Sentence tails, joined after the rendered handles:
    one: 'is watching this one.',
    areWatching: 'are watching.',
    plusOthers: (count: number) => `+ ${count} more in the crawl, watching.`,
    countOnly: (count: number) =>
      `${count} in the crawl are watching this one.`,
    countOnlyHonest: "No handles to drop yet. Beta's early.",
    rosterToggle: (count: number) => `see all ${count}`,
    rosterHide: 'show fewer',
    rosterTitle: 'The crawl on this show',
    rosterOthers: (count: number) =>
      `${count} other ${count === 1 ? 'watcher' : 'watchers'}, no handle yet`,
    // The affordance the retired "N watching · alerts on price + sold out"
    // count tail used to carry now rides under the inactive Watch button. It
    // claims tracking and nothing else: fan-out fires only from the admin
    // price-review path, so a crawled drop notifies nobody (#1107).
    watchHint: 'Watch to track the price.',
    // The watching half of the same line. Both states carry copy so the strip
    // holds its height across a toggle.
    watchStatusOn: "You're watching this one.",
  },

  // ── Small event row ─────────────────────────────────────────────
  // Shown in venue pages and watching lists — compact event row
  smallEventRow: {
    priceNotAnnounced: 'tba',
  },

  // ── Event title ─────────────────────────────────────────────────
  // Shown on event cards and the event detail page — event title with supporting artists
  eventTitle: {
    lead: 'with',
    moreSuffix: 'more',
    tourAriaLabel: (tourName: string) => `Tour: ${tourName}`,
    // Screen-reader roster conjunction (e.g. "A, B, and C").
    rosterConjunction: 'and',
  },

  // ── Event detail ────────────────────────────────────────────────
  // Shown on the event detail page
  eventDetail: {
    // The back chip's accessible name now lives in BACK_CHIP_COPY.label
    // (components/consumer/back-chip/definitions/copy.ts) — one string shared
    // by every surface that renders the chip.

    // Info row labels
    venueLabel: 'Venue',
    dateLabel: 'Date',
    doorsShowLabel: 'Doors / Show',
    agesLabel: 'Ages',
    allAges: 'All Ages',
    // Read-only price row on the public mirror (#72). The authed page renders
    // the full price block instead, so this label has exactly one caller.
    priceRowLabel: 'Tickets',

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
    emptyEyebrow: 'Denver',
    emptyTitle: 'No venues yet.',
    emptyBody: 'They land here as we add them.',
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

  // ── Route not-found ─────────────────────────────────────────────
  // Shown when a route calls notFound() — an artist, venue or event slug that
  // isn't in the database. Deliberately separate from `error`: nothing broke,
  // so the page offers a way onward rather than a retry.
  notFound: {
    heading: 'Nothing here.',
    body: "That page doesn't exist. The link may be old, or the show may have come off the calendar.",
    browseButton: 'Browse shows',
  },

  // ── Public event mirror (/e/:id) ────────────────────────────────
  // The read-only page someone lands on from a shared poster link (#72). It
  // has no Watching pill, no price submission and no reports — those all need
  // an account — so the one thing it offers instead is a way in.
  publicEvent: {
    signUpPrompt: 'Watch this show, track prices, and get alerts.',
    signUpButton: 'Create an account',
    // The mirror's own 404. A shared link outlives the show it points at, so
    // "old link" is the likeliest story, not "you typed it wrong".
    notFoundHeading: 'This show is gone.',
    notFoundBody:
      "We couldn't find that show. The link may be old, or the show may have come off the calendar.",
    notFoundHomeButton: 'Go to Concert Crawl',
    notFoundBrowseButton: 'Browse shows',
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
    // Imminent-show tag + tooltip. Shown when the show is within the imminent
    // window (SP_POLICY.imminentThresholdDays) and the confirm requirement is
    // therefore bumped, so the "3 of 3" strip doesn't read as a mistake (#895).
    imminentTag: 'Days away',
    // Parametrised from SP_POLICY so the stated window/thresholds can never
    // drift from what the server actually enforces (the drift this copy fixes).
    imminentTooltip: (thresholdDays: number, imminent: number, base: number) =>
      `Shows within ${thresholdDays} ${thresholdDays === 1 ? 'day' : 'days'} need ${imminent} ${imminent === 1 ? 'confirmation' : 'confirmations'} instead of ${base}, so prices stay accurate as the date gets close.`,
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
    // Same announced-not-drawn gate as the submit card (#1247).
    ariaConfirmPriceSignedOut: 'Confirm price: sign up to confirm',
    sawDifferentNumber: 'Saw a different number?',
    ariaSawDifferentNumberSignedOut:
      'Saw a different number? Sign up to submit a price',
    // Footer — self-locked view
    yourSubmissionLabel: 'Your submission',
    waitingOnOneFan: 'Waiting on one more fan',
    // Footer — submitter view
    editButton: 'Edit',
    withdrawButton: 'Withdraw',
  },

  // ── Settings ────────────────────────────────────────────────────
  settings: {
    submissionAge: (ago: string) => `${ago} ago`,
    anonymousLabel: 'anonymous fan',
    anonymousExplainer:
      "You're browsing as an anonymous fan. Pick a handle to get credit for your price submissions (it applies retroactively).",
    heroCredNudge: 'Submit a price to start earning.',
    heroAnonLead: 'Submissions show as',
    heroAnonTail: 'Pick a handle if you want credit.',
    heroJoinedLabel: 'joined',
    heroEditButton: 'Edit',
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

      // ── DeleteAccountSheet — shared by the mobile sheet and the
      // desktop dialog, which render the same words in two branches.
      confirmHeading: 'Delete your account?',
      confirmCantUndo: "This can't be undone.",
      confirmBodyLead: 'Your handle',
      confirmBodyRest: (submissionCount: number) =>
        `email, and plan are deleted. ${submissionCount} submitted ${
          submissionCount === 1 ? 'price stays' : 'prices stay'
        } on the public record. Your name is removed from them.`,
      // "Type DELETE to confirm." — split because DELETE is bolded.
      confirmLabelLead: 'Type',
      confirmLabelToken: 'DELETE',
      confirmLabelTail: 'to confirm.',
      // The desktop dialog's input placeholder is just the token, where
      // the mobile sheet uses `deleteConfirmPlaceholder` above.
      confirmPlaceholderDesktop: 'DELETE',
      keepAccountButton: 'Keep my account',
      deletingButton: 'Deleting…',
      // Desktop-only confirm label; mobile swaps between
      // `deleteButtonArmed` / `deleteButtonDisabled`.
      deleteForeverButton: 'Delete forever',
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
    watchlistRow: 'Watching',

    // ── Settings shell chrome ─────────────────────────────────────
    // Shared by SettingsRoute (mobile) and SettingsRouteDesktop, except
    // where a key is suffixed `Desktop` — those are cases where the two
    // shells deliberately word the same section differently.
    mobileHeaderBack: '← Done',
    mobileHeaderTitle: 'Settings',
    desktopBackToBrowse: '← Back to browse',
    operationsSection: 'Operations',
    adminRow: 'Admin',
    profileSection: 'Profile',
    profileSectionSub: 'What other fans see when you submit a price.',
    // Desktop labels this section "Plan"; mobile uses `planSection`
    // ("Your plan"). Kept separate so neither shell silently changes.
    planSectionDesktop: 'Plan',
    planSectionSubDesktop: "What you're paying us. (Spoiler: nothing.)",
    appearanceSectionSub:
      'Three flavors. Pick the one that hurts your eyes least.',
    accountSectionSub:
      'Your account credentials are managed securely. Click any row to update.',
    dangerSectionSub: 'The exits.',
    editProfileDialogAriaLabel: 'Edit profile',
    // Shown when a profile has no city set.
    cityFallback: '—',
    submissionsTotal: (total: number) => `${total} total`,
    submissionsConfirmedSuffix: (confirmedCount: number) =>
      ` · ${confirmedCount} confirmed`,
    submissionsConfirmedSuffixDesktop: (confirmedCount: number) =>
      ` · ${confirmedCount} confirmed by other fans.`,

    // ── Desktop profile panel ─────────────────────────────────────
    // `handleExplainer*` wraps the highlighted @handle; the lead and tail
    // are one sentence split only because the middle is styled.
    handleExplainerLead: 'Other fans see',
    handleExplainerTail:
      "on every price you've submitted, and can tag you on confirmations. Drop the handle any time to go anonymous. Your existing submissions get reattributed.",
    // `anonymousCardLead` + `anonymousCardLabel` are also one sentence,
    // split because the label renders in italics.
    anonymousCardLead: 'Submitting as',
    anonymousCardLabel: 'anonymous fan.',
    anonymousCardBody:
      "That's fine. Most fans stay anonymous. If you want credit on your prices (and the option to be tagged when someone confirms one), pick a handle.",
    pickHandleCta: 'Pick a handle',

    // ── Clerk attribution (AccountManagementRow + desktop Account panel) ──
    clerkAttribution:
      'Sign-in credentials and connected accounts are managed by Clerk.',
    clerkPrivacyLink: 'Privacy Policy →',

    // ── ThemePickerInline ─────────────────────────────────────────
    themeLabel: 'Theme',
    themeTapHint: 'tap to switch',

    // ── CredChip ──────────────────────────────────────────────────
    credChipLabel: 'cred',
    credChipTooltip:
      "Cred is what you earn for every verified price. We're working on what you can spend it on.",

    // ── ProfileEntryAvatar ────────────────────────────────────────
    profileEntryAriaLabel: (handle: string) => `@${handle}, settings`,
    profileEntryAriaLabelAnon: 'Settings',

    // ── MySubmissionsList — empty state ───────────────────────────
    emptySubmissionsTitle: "You haven't submitted any prices yet.",
    emptySubmissionsBody:
      'The next show you go to, drop the price you saw. Two fans confirm and it goes live.',

    // ── SubmissionItem ────────────────────────────────────────────
    submissionConfirms: (confirms: number) =>
      `${confirms} other ${confirms === 1 ? 'fan' : 'fans'} confirmed.`,
    submissionCredEarned: '+1 cred',
    submissionDisputed: 'Someone disputed this. Tap to see what they saw.',

    // ── EditProfileForm ───────────────────────────────────────────
    editCancelButton: '← Cancel',
    editProfileTitle: 'Edit profile',
    editSavingButton: 'Saving…',
    editCheckingButton: 'Checking…',
    editSaveButton: 'Save',
    editSaveErrorFallback: 'Something went wrong. Try again.',
    avatarColorLabel: 'Avatar color',
    avatarColorSwatchAriaLabel: (color: string) => `Avatar color: ${color}`,
    handleLabel: 'Handle',
    cityLabel: 'City',
  },

  // ── Multi-tier price display ────────────────────────────────────
  // Shared copy for TierAlternateRow, MultiTierLiveCard, MixedTierCard, PendingStack
  // ── Price staleness ─────────────────────────────────────────────
  // StaleStamp + relTimeAgo — shown wherever a price carries an observation
  // timestamp, so every surface words staleness identically.
  priceStaleness: {
    asOf: (relTime: string) => `as of ${relTime}`,
    asOfStale: (relTime: string) => `as of ${relTime}, could be stale`,
    couldBeStaleSuffix: ', could be stale',
    justNow: 'just now',
    daysSuffix: 'd ago',
    hoursSuffix: 'h ago',
    minutesSuffix: 'm ago',
    unknown: 'unknown',
  },

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
      "Two fan confirms moves a price from pending to live. Pick how you checked. We're trying to keep this honest, not fast.",

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
    confirmButton: 'Confirm: same number',

    // Escape link
    escapeLink:
      'Saw a different tier or a different price? Submit an update instead.',

    // Honesty disclaimer shown at bottom of verify options
    honestyDisclaimer:
      'Confirming is a community action. Only confirm if you actually checked the price.',

    // Self-locked state
    selfLocked: {
      waitingNotice:
        "Your submission is pending. You can't confirm your own price, but 2 other fans can.",
      editButton: 'Edit submission',
      withdrawButton: 'Withdraw',
    },

    // Radiogroup wrapping the VerifyOption list
    verifyOptionsAriaLabel: 'Verification method',

    // Shown on a box-office submission inside SubmissionDetailCard
    boxOfficeFaceValueNote: 'face value · no fees',

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
      // Same announced-not-drawn gate as the submit card (#1247).
      ariaButtonLabelSignedOut: 'Submit an update: sign up to submit a price',
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
    howFoundLabel: 'How you found out *',
    ceilingHint: 'Optional. Helps fans know the full price range.',
    honestyDisclaimer: 'By submitting, you confirm this is accurate.',
    // Fine print under the submit form's honesty disclaimer
    honestyFootnote:
      'By submitting you confirm this is accurate to the best of your knowledge. Intentionally false reports may result in account suspension.',
    footerDisclaimer: 'Your update goes pending until another fan confirms.',
    submitButton: 'Submit update',
    submittingButton: 'Submitting…',
    cancelButton: 'Cancel',
    successHeading: 'Update submitted.',
    successBody:
      'Your update is pending. One more fan confirming it moves it forward.',
    successBackButton: 'Back to show',
    errorHeading: "Didn't go through.",
    errorBody:
      "Couldn't reach the server. Your inputs are still here. Try again or come back later.",
    errorTryAgainButton: 'Try again',
    errorCloseButton: 'Close',
  },

  // ── Price region ────────────────────────────────────────────────
  // Shown on the event detail page — face-value framing, provenance CTAs,
  // multi-source tier display, alt-source rows, and add-tier success states.
  priceRegion: {
    faceValue: {
      eyebrow: 'Face value ≠ resale',
      // eslint-disable-next-line no-restricted-syntax -- design-locked string; the audit recorded the em-dash fix but Design owns the change
      headlineDefault: "That's resale — not face value.",
      headlineNoPrice: 'All we can see is resale.',
      // Single subline — property table state #12 (no-price) only overrides the
      // headline; subline copy is shared between the sold-out-with-resale (#10)
      // and no-price-with-resale (#12) variants.
      subline: 'Only resale tickets left. Know the box-office price? Add it.',
      ladderResaleLabel: 'Resale',
      ladderResaleSub: (vendor: string) => `${vendor} · marked up over face`,
      ladderResaleRightFallback: 'available, above face value',
      ladderBoxofficeLabel: 'Box office',
      ladderBoxofficeSub: 'the printed price · no fees',
      ladderBoxofficeRight: 'not reported',
      ctaLabelDefault: 'Add the box-office price',
      ctaLabelNoPrice: "Add a price you've seen",
      caption: 'Goes live once one more fan confirms',
    },
    // LOCKED §9 Q1 — ContributeFaceValueCard copy (Appendix A.1).
    // Differs from faceValue.* — eyebrow drops the "≠ resale" framing, body
    // pitches contribution directly. New component, new copy block.
    contributeFaceValue: {
      eyebrow: 'Face value',
      // eslint-disable-next-line no-restricted-syntax -- design-locked string; the audit recorded the em-dash fix but Design owns the change
      headline: 'No price to show — yet.',
      subline: 'Sold out, nothing listed. Know the box-office number? Add it.',
      ladderBoxofficeLabel: 'Box office',
      ladderBoxofficeSub: 'the printed price · no fees',
      ladderBoxofficeRight: 'not reported',
      ctaLabel: 'Add the box-office price',
      caption: 'Goes live once one more fan confirms',
    },
    // SoldOutPriceCard status badge — one constant for the mobile and desktop
    // call sites so the two layouts stay in parity.
    soldOutBadge: 'Sold out',
    // LOCKED §9 Q1 — SoldOutPriceCard variant='no-listing' caption (Appendix A.2).
    soldOutNoListingCaption:
      // eslint-disable-next-line no-restricted-syntax -- design-locked string; the audit recorded the em-dash fix but Design owns the change
      'No tickets listed anywhere we can see — not even resale.',
    provenance: {
      getTickets: 'Get Tickets',
      seeResale: 'See resale tickets',
      captionBoxoffice: (vendor: string) => `${vendor} · face value, no fees`,
      captionPrimary: (vendor: string) =>
        `Official vendor · ${vendor} · face + fees`,
      captionResale: (vendor: string) =>
        `${vendor} resale · usually above face value`,
      ariaLabelBoxoffice: (vendor: string) =>
        `Get tickets at the box office via ${vendor}: face value, no fees`,
      ariaLabelPrimary: (vendor: string) =>
        `Get tickets via ${vendor}: official vendor, face value plus fees`,
      ariaLabelResale: (vendor: string) =>
        `Buy resale on ${vendor}: usually above face value`,
    },
    mtListChip: {
      fromPrefix: 'from',
      // LOCKED §9 Q2 — MT_ListChip kind='resale' trailing tag (Appendix A.3).
      // NON-NEGOTIABLE that this always renders on the resale variant.
      resaleTag: 'resale',
    },
    // LOCKED §9 Q3 — DisputedPriceCard / PendingCardB footer pointer (Appendix A.4).
    dispute: {
      // eslint-disable-next-line no-restricted-syntax -- design-locked string; the audit recorded the em-dash fix but Design owns the change
      counterPointerLabel: 'Someone posted a different price — see it',
    },
    multiSource: {
      eyebrow: 'Tickets',
      fromLabel: 'from',
      metaTemplate: (vendor: string) =>
        `seen on ${vendor} · face value · no fees`,
      orPayConvenience: 'Or pay for convenience',
      otherTiers: 'Other tiers',
    },
    altSourceRow: {
      pricePrefix: '$',
      kindLabels: {
        boxoffice: 'box office',
        resale: 'resale',
        community: 'community',
      },
    },
    addTierSuccess: {
      headline: (tier: string) => `${tier} price is in. Thanks.`,
      bodyTemplate: (price: string, source: string) => `$${price} ${source} · `,
      pendingFragment: 'sits pending · 1/2 until one more fan confirms.',
      addAnotherEyebrow: 'This show has more than one tier?',
      addPillTemplate: (tier: string) => `+ Add ${tier.toLowerCase()}`,
      helperLine:
        'Each tier is its own quick submission. Only add the ones you actually saw.',
      doneButton: 'Done',
      // Shown instead of the add-tier pills when the caller has used all
      // contribution acts for this event today (#876). Deliberately vague —
      // must NOT claim "you've submitted all tiers/sources."
      limitReachedLine:
        "That's your three for this show today. If prices change, come back tomorrow.",
      // Per copy-rule — SourceCategory enum → label string used inside bodyTemplate.
      sourceLabels: {
        boxoffice: 'box office',
        standard: 'standard',
        resale: 'resale',
      },
    },
    disputeRace409Toast:
      'Another update was just submitted. Refresh to see it.',
    adminDeferPillLabel: 'Admin requested more info',
  },

  // ── Submit price v2 ─────────────────────────────────────────────
  // Shown in the redesigned price submission form. Replaces the howFound-bearing
  // form. Field order: source → number → tier → vendor.
  // NOTE: required markers are NOT embedded in label strings. The shipped
  // `FormLabel` primitive accepts a `req` boolean prop and renders a
  // `var(--accent)`-colored asterisk separately. Required fields: source +
  // vendor — pass `req` to FormLabel at the call site.
  submitPriceV2: {
    // Rendered as one sentence with `$2,000` bolded and `pending` italicised,
    // so it has to be stored as the individual text nodes around that markup.
    capNote: {
      beforeCap: 'Prices are capped at ',
      cap: '$2,000',
      betweenCapAndPending: '. Submissions stay ',
      pending: 'pending',
      afterPending: ' until 2 fans confirm.',
    },
    sourceLabel: "Where's this price from?",
    sourceHelper:
      'Box office is face value, the most useful number for other fans.',
    sourceOptionBoxoffice: 'Box office',
    sourceOptionStandard: 'Standard ticket',
    sourceOptionResale: 'Resale',
    floorLabelBoxoffice: 'Face value',
    floorLabelStandard: 'Floor',
    floorLabelResale: 'Resale price',
    floorHintBoxoffice: 'the printed price',
    floorPlaceholder: '32',
    ceilingLabel: 'Ceiling',
    ceilingPlaceholder: 'optional',
    tierLabel: 'Tier',
    vendorLabel: 'Vendor',
    vendorOptionVenue: 'Venue',
    vendorOptionAXS: 'AXS',
    vendorOptionTicketmaster: 'Ticketmaster',
    vendorOptionSeatGeek: 'SeatGeek',
    vendorOptionDICE: 'DICE',
    vendorOptionEventbrite: 'Eventbrite',
    vendorAutoFilledNote: 'Auto-filled because source is box office',
    // Multi-tier bundle form (#832). {tier} and {count} are replaced at the
    // call site with .replace() — no i18n framework in play.
    multiTier: {
      addTierButton: '+ Add another tier',
      panelFallbackHeading: 'Another tier',
      // {tier} = the panel's tier name, or panelFallbackHeading when unset.
      removeTierAriaLabel: 'Remove {tier}',
      submitButtonMulti: 'Submit {count} tiers',
      submitButtonEdit: 'Save changes',
      errorAlreadySubmitted:
        'You already submitted a {tier} price. Edit it from the event page.',
    },
  },

  // ── Vendor labels ───────────────────────────────────────────────
  // Display labels for stored vendor enum values. Round-3 locked decision #2:
  // the box-office vendor never renders as the venue's own name, so this label
  // stays generic. Read it through vendor-display.ts, not directly.
  vendors: {
    venueBoxOffice: 'Venue box office',
    // The picker's catch-all reads "Somewhere else", which only works as a
    // choice. Rendering a stored value needs a noun: "seen on another seller".
    otherVendor: 'another seller',
  },

  // ── Shareable cards (#72) ───────────────────────────────────────
  share: {
    // Poster taglines. ⚠️ VERBATIM — these are the signed-off output of the
    // voice pass (#782) recorded in the handoff README's voice table. Do not
    // rewrite, re-punctuate, or sentence-case them. Read them through
    // `lib/share/taglines.ts`, never by indexing this object directly.
    taglines: {
      going: 'found this one on Concert Crawl. see you in the pit.',
      soldout: "sold out. now we're all refreshing stubhub at 2am together.",
      drop: "price dropped. so did my dignity, but that's unrelated.",
    },
    // The badge drawn on the poster for each state. `going` is third-person
    // on purpose: it is the fallback for every event that is neither sold out
    // nor discounted, and the route renders it with no session at all for OG
    // crawlers — so a first-person "I'm going" asserts an attendance the card
    // never checked. Handoff §1 locks this pill as `GOING`.
    stateLabels: {
      going: 'Going',
      soldout: 'Sold out',
      drop: 'Price drop',
    },
    // The signature set into the foot of every poster. Not a logo glyph —
    // the handoff's §1 is explicit that the poster carries no mark.
    wordmark: 'ConcertCrawl',
    // Trigger + sheet chrome.
    triggerLabel: 'Share this show',
    sheetTitle: 'Share this show',
    // Poster shape. Only the Poster direction ships, so there is no direction
    // switcher — the shape picker is the whole of the sheet's configuration.
    ratioLabel: 'Shape',
    // Labels, not keys — the handoff locks the `story`/`square`/`link` keys and
    // their pixel dimensions, not what the buttons say. `link` reads as a
    // destination under a "Shape" legend, so it is labelled by its shape.
    ratios: {
      story: 'Story',
      square: 'Square',
      link: 'Wide',
    },
    // Share sheet destinations.
    //
    // ⚠️ The handoff prototype mocked six tiles — Instagram Story, Instagram
    // Feed, X, Messages, Save, Copy. The first four have no honest web
    // implementation: no URL scheme hands a PNG to Instagram or Messages from
    // a browser, and a tile that opens a compose window with the image missing
    // is worse than no tile at all. The OS share sheet does all four properly
    // wherever the platform supports it, so that is the one tile.
    destinations: {
      systemShare: 'Share…',
      saveImage: 'Save image',
      copyLink: 'Copy link',
    },
    // Transient states on the destination buttons.
    copyLinkDone: 'Link copied',
    shareFailed: "Couldn't share. Try saving the image instead.",
    // Preview states. The poster is rendered on demand and measured at
    // 2.7–6.8s on staging, so the preview is a blank box for long enough that
    // it has to say what it is doing.
    previewLoading: 'Drawing your poster…',
    previewFailed: "Couldn't draw the poster. The link below still works.",
    // Alt text for the rendered poster. {artist}, {venue}, {date} and {state}
    // are substituted at render time.
    altTemplate:
      'Concert Crawl poster for {artist} at {venue}, {date}. {state}.',
    // What a link to the public mirror unfurls as in iMessage, Slack and on
    // Twitter/X. {artist}, {venue}, {date} and {city} are substituted at
    // request time. The image alt is deliberately terser than `altTemplate`:
    // the unfurl already shows the title beside it, so repeating "Concert
    // Crawl poster for" there says the same thing twice.
    og: {
      titleTemplate: '{artist} at {venue}',
      descriptionTemplate:
        '{date} in {city}. Details and prices on Concert Crawl.',
      imageAltTemplate: '{artist} at {venue}, {date}',
    },
  },

  // ── Concert Passport (#85) ──────────────────────────────────────
  // The keepsake card built from Concert History. Unlike the poster this is
  // about the person, not a show, so nothing here names an artist or a venue.
  passport: {
    pageTitle: 'Your Passport',
    // The card is the page. This line only says what it is made of, because a
    // subtitle that re-describes the card the reader is looking at is noise.
    pageSubtitle: 'Every night you marked yourself going to, stamped.',
    // No "Copy link" — a passport has no public page to link to, and offering
    // one would imply the card is shareable by URL when it is deliberately not.
    shareLabel: 'Share…',
    // The card is drawn on demand and takes a moment. Held on the share button
    // until the image is in hand, because a button that looks ready and then
    // does nothing for several seconds reads as broken.
    preparingLabel: 'Preparing…',
    saveLabel: 'Save image',
    shareFailed: "Couldn't share. Try saving the image instead.",
    downloadName: 'concert-passport.png',
    // The state before a single show has been marked attended. Not a locked
    // state: the plan is fine, the stamp book is simply empty.
    emptyEyebrow: 'Passport',
    emptyTitle: 'No stamps yet',
    emptyBody:
      'Mark yourself going to a show and it lands here once the night has passed.',
    emptyCta: 'Find a show',
  },

  // ── ThemeToggle ─────────────────────────────────────────────────
  // The per-theme button labels come from THEME_META in @/theme/themes;
  // only the radiogroup's own accessible name lives here.
  themeToggle: {
    groupAriaLabel: 'Theme',
  },

  // ── Dispute price page ──────────────────────────────────────────
  disputePage: {
    cancelLink: '← Cancel',
    heading: 'Dispute price',
    disputingLabel: "You're disputing",
    requirement:
      "A dispute needs an alternate price + vendor. If you saw something different, log it. That's how we find the truth.",
  },
} as const

// ── Vendor picker (#1193) ─────────────────────────────────────────
// Display strings for the "Where it's listed" field. Keyed by the stored enum
// value so the display string can be re-worded without touching the contract —
// `viagogo` really is lowercase, and the catch-all reads "Somewhere else" while
// persisting as `Other`.
export const VENDOR_PICKER_COPY = {
  label: "Where it's listed",
  // The chip reads "More…" so it fits the row; the accessible name spells it
  // out, since an ellipsis says nothing to a screen reader.
  moreTrigger: 'More…',
  // Names the question too: the trigger sits outside the radiogroup, so it
  // inherits no label from it.
  moreTriggerLabel: "Where it's listed: more vendors",
  sheetTitle: "Where it's listed",
  popoverTitle: 'More vendors',
  // Accessible name for the fourth chip once it holds a value — the state has
  // to be in the name, since a disclosure button can't be a radio.
  selectedTriggerLabel: "Where it's listed: {vendor}. Change vendor",
  clearLabel: 'Clear {vendor}',
  groups: {
    primary: { label: 'Primary', caption: 'sold at face value' },
    resale: { label: 'Resale', caption: 'priced above face value' },
  },
  vendors: {
    VenueBoxOffice: 'Venue box office',
    AXS: 'AXS',
    Ticketmaster: 'Ticketmaster',
    Etix: 'Etix',
    Eventbrite: 'Eventbrite',
    DICE: 'DICE',
    StubHub: 'StubHub',
    SeatGeek: 'SeatGeek',
    VividSeats: 'Vivid Seats',
    Viagogo: 'viagogo',
    TicketNetwork: 'TicketNetwork',
    Other: 'Somewhere else',
  },
} as const
