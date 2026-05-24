// Shown in the release notes page, feature drop pill, and spotlight modal — the changelog and feature announcement flow

export const COPY = {
  page: {
    eyebrow: 'Transmission log',
    heading: 'What we shipped.',
    description:
      "Everything we’ve shipped, in one place. Spotted a bug or got an idea?",
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
    stepIndicatorAriaLabel: (stepNumber: number) => `Go to step ${stepNumber}`,
    founderEyebrowFallback: 'Behind the build',
    founderSignFallback: '— Hugh',
    dismissCta: 'Maybe later',
    fallbackCta: 'Got it',
  },

  versionFooter: {
    ariaLabel: 'View changelog',
    unreadLabel: "What’s new",
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
      eyebrow: 'Following · we’ll ping you',
    },
    priceDrop: {
      watchingTrend: 'Watching 14 d · lowest yet',
      eyebrow: 'Watch · alert · save',
    },
    setlist: {
      likelyLabel: 'Likely · last 7',
      setlistHeading: 'SETLIST · TONIGHT',
      tapToSeeMore: 'tap to see full list',
      eyebrow: 'What they’re playing',
    },
    firstTimer: {
      leftChipLabels: ['ALL AGES', 'DOORS 7PM', 'NO RE-ENTRY'],
      rightChipLabels: ['CASH BAR', '2 DRINKS MIN', 'CASH TIPS'],
      eyebrow: 'First time? · here’s the lay',
    },
    lastTime: {
      eyebrow: 'Last time in town',
    },
    supportAct: {
      headlinerRole: 'HEADLINER · 9:00 PM',
      openerRole: '★ OPENING · 8:00 PM',
      newToYouSuffix: 'new to you',
      eyebrow: 'Don’t miss the opener',
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
      prices: { eyebrow: 'Crowd-sourced', verifiedLabel: 'Verified', faceValue: 'Face value' },
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
} as const
