export const ONBOARDING_COPY = {
  // Handwritten sign-off shared by FounderNote and YoureIn. The em-dash is a
  // deliberate attribution dash and stays — it is the one exception to the
  // no-em-dash copy rule.
  // Decorative avatar monogram beside the founder signature. aria-hidden at
  // the call sites: a screen reader announcing a bare "H" is noise.
  founderMonogram: 'H',
  signature: '— Hugh',

  founderNote: {
    eyebrow: 'A note from the developer',
    heading: 'Thanks for signing up.',
    p1: "I'm Hugh. I go to a lot of shows. Concert Crawl is the thing I always wanted: one place to see what's playing, what it costs, and who to drag along.",
    p2: "It covers Denver for now. It tells you where every price came from, and it says so plainly when it doesn't know one.",
    p3: 'This tour takes about two minutes. You can skip it. Your account already works, and it lives in your account menu if you want it later.',
  },

  howItWorks: {
    eyebrow: 'How this works',
    heading: 'Honest by design.',
    lede: "Two minutes on where the prices come from, and what we'll never do.",
    rows: [
      {
        kicker: '01',
        title: "We crawl, we don't sell.",
        body: "We read public listings from venues. We don't sell tickets and we don't take a cut. See the price, tap through, buy at the source.",
      },
      {
        kicker: '02',
        title: 'Every price says where it came from.',
        body: null,
      },
      {
        kicker: '03',
        title: 'Verifications expire.',
        body: "A community price gets more trustworthy once another fan confirms it, but even verified prices go stale after a week. We'll show you when one is old.",
      },
    ],
    priceSources: [
      {
        label: 'BOX OFFICE',
        kind: 'primary' as const,
        description: 'Straight from the venue. Face value, no markup.',
      },
      {
        label: 'COMMUNITY',
        kind: 'community' as const,
        description:
          'Reported by a fan, confirmed by others. We name the vendor.',
      },
      {
        label: 'RESALE',
        kind: 'resale' as const,
        description:
          'A marketplace listing. Secondary market, not face value. We flag it.',
      },
    ],
    noPrice: "If we can't find a price, we say so.",
  },

  whatItDoesToday: {
    eyebrow: 'Today',
    heading: 'What you can do right now.',
    lede: "Denver first. Here's what's actually in front of you.",
    items: [
      'Browse every upcoming show in the Denver area',
      'Compare real prices side by side, with their sources',
      'Watch shows you care about, and we track the price',
      'Submit a price you saw, or confirm one someone else did',
      'Follow an artist and see everything they have coming up',
    ],
  },

  whatItDoesntYet: {
    // Pill on each missing-feature row
    soonBadge: 'soon',
    eyebrow: 'Not yet',
    heading: 'What’s missing.',
    lede: "These are coming, not abandoned. We'd rather say so than fake it.",
    items: [
      {
        title: 'Cities outside Denver.',
        body: 'The crawl is regional for now. Others onboard later.',
      },
      {
        title: 'One feed for your artists.',
        body: 'You can follow a band today, but their shows still live on their own page.',
      },
      {
        title: 'Price alerts.',
        body: "We catch some drops, not all of them. Don't count on us to tell you yet.",
      },
    ],
  },

  makeItYours: {
    eyebrow: 'Make it yours',
    heading: 'Pick your drip.',
    lede: 'Nine themes, different genre flavors. Pick one now, switch it any time from the account menu.',
    preview: {
      currentlyUsing: 'Currently using',
      tonight: 'Tonight',
      venue: 'Ogden · 9PM',
      artist: 'The Midnight',
      price: '$35',
      tier: 'GA · 21+',
      watchButton: 'Watch',
    },
  },

  youreIn: {
    eyebrow: "You're in",
    heading: "That's the tour.",
    headingAccent: 'Go find something.',
    personalAskLabel: "One favor, if you're up for it",
    personalAskBody:
      "Most shows don't have a price yet. If you see one (at the box office, on a listing, on your receipt), drop it in. Every price you add makes the calendar more useful for the next person.",
  },

  // Step 6. The genres are a FILTER for the next screen and nothing else: we
  // store no preference, so the lede has to say so plainly rather than let a
  // visitor assume they have just configured something permanent.
  pickGenres: {
    eyebrow: 'Your lanes',
    heading: 'What do you actually listen to?',
    lede: "Pick a few and we'll suggest artists playing Denver soon. This only shapes the next screen; we don't save it.",
    // Names the chip group for screen readers, which otherwise meet a run of
    // unexplained checkboxes.
    groupLabel: 'Genres',
    // Nothing came back from the listings. Rare, and survivable: the step is
    // skippable and the next one falls back to every suggestion.
    empty:
      "We couldn't load genres. The next screen will suggest a bit of everything.",
  },

  // Step 7. Following is the only thing in the tour that writes anything, so
  // the copy carries the whole bargain: what it costs, that a pick is not a
  // commitment, and that leaving empty-handed is a real option.
  pickArtists: {
    eyebrow: 'Follow',
    heading: 'Follow a few of these.',
    // Says what a follow DOES. Careful: following surfaces dates, it never
    // moves shows into your Watching.
    lede: "They all have a Denver date coming up. Follow one and we'll tell you the day they book the next.",
    // Real pluralisation, never a literal "(s)".
    commitLocked: (count: number) =>
      `Follow ${count} ${count === 1 ? 'artist' : 'artists'} with Premium`,
    commit: (count: number) =>
      `Follow ${count} ${count === 1 ? 'artist' : 'artists'} →`,
    // Zero selected. The step is skippable, so the button says what it does
    // rather than pretending a follow is on its way.
    skip: 'Continue without following →',
    // Under the button. The locked line answers the fear the locked button
    // just created; the unlocked ones answer "what am I signing up for".
    subLocked: 'Your picks are held while you upgrade. Nothing gets lost.',
    subSelected: 'Unfollow any of them any time.',
    subNone: 'You can follow anyone from search later.',
  },

  nav: {
    // Replaces the beta-era 'Code accepted · Welcome'. The tour is now a
    // post-auth welcome on a permanent route, not the end of an invite funnel.
    railLabel: 'Welcome · The two-minute tour',
    nextButton: 'Next →',
    backButton: '← Back',
    // Terminal step: the tour returns the visitor to what they were doing
    // rather than sending them on to sign-up.
    finishButton: (destination: string | null) =>
      destination ? `Back to ${destination} →` : 'Start browsing →',
    finishFootnote: (destination: string | null) =>
      destination
        ? 'Your show is still watched'
        : 'The tour lives in your account menu',
    stepCounter: (step: number, total: number) => `Step ${step} of ${total}`,
    skip: {
      default: 'Skip',
      menu: 'Close',
      midIntent: (destination: string) => `Skip: back to ${destination}`,
      pending: (destination: string) =>
        `Watching ${destination}. We'll take you back`,
      menuRailLabel: 'How it works',
    },
    stepLabels: {
      welcome: 'WELCOME',
      how: 'HOW IT WORKS',
      today: 'TODAY',
      notyet: 'NOT YET',
      theme: 'MAKE IT YOURS',
      genres: 'YOUR LANES',
      artists: 'FOLLOW',
      done: "THAT'S THE TOUR",
    },
  },
}
