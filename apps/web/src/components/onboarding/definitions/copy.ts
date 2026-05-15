export const ONBOARDING_COPY = {
  founderNote: {
    eyebrow: 'A note from the developer',
    heading: 'Hey, thanks for trying this thing.',
    p1: "I'm Hugh. I go to a lot of shows. Concert Crawl is the tool I always wanted: a place to see what's playing, what it costs, and who you should drag along with you.",
    p2: "This is a private beta, so a lot of edges are still rough. But, the core product is there and I'm excited for you to get your hands on it. That weird neich artist none of your friends have heard of? You should know when they're playing (I know I've kicked myself for missing plenty of shows).",
    p3: "Friends, you're here early on purpose. I trust your feedback and want your insight. Tell me what works, what's confusing, what's missing. I'll read all of it and the app will be better for it.",
  },

  howItWorks: {
    eyebrow: 'How this works',
    heading: 'Honest by design.',
    lede: "Two minutes on what to expect from the prices, the listings, and what we'll never do.",
    rows: [
      {
        kicker: '01',
        title: "We crawl, we don't sell.",
        body: "Concert Crawl reads public listings from venues. We don't sell tickets and we don't take a cut. See the price, tap a button, go to the source.",
      },
      {
        kicker: '02',
        title: "Prices come from somewhere — we'll tell you where.",
        body: null,
      },
      {
        kicker: '03',
        title: 'Verifications expire.',
        body: "A community price is more trustworthy after another fan confirms it — but even verified prices go stale after a week. We'll show you when something is old.",
      },
    ],
    priceSources: [
      {
        label: 'BOX OFFICE',
        kind: 'primary' as const,
        description:
          "Directly from the venue - that's the gold standard. No markup.",
      },
      {
        label: 'COMMUNITY',
        kind: 'community' as const,
        description:
          "Reported by a fan - confirmed by others. We'll show you the ticket vendor.",
      },
      {
        label: 'RESALE',
        kind: 'resale' as const,
        description:
          "A marketplace listing — secondary market, not face value. We'll flag it.",
      },
    ],
    noPrice: "If we can't find a price, we'll say so.",
  },

  whatItDoesToday: {
    eyebrow: 'Today',
    heading: 'What you can do right now.',
    lede: "We're starting small. Denver is the pilot. Here's what's actually in front of you on day one:",
    items: [
      'Browse upcoming shows in the Denver area',
      'See real prices side-by-side, with their sources',
      "Watch shows you're curious about",
      'Submit a price you saw — or report what you paid at the box office',
      'Plenty of other fun bells and whistles with more on the horizon',
    ],
  },

  whatItDoesntYet: {
    eyebrow: 'Not yet',
    heading: "What's missing — on purpose.",
    lede: `Things on this list are coming, not abandoned. We're aspirational, but won't ship anything until it's ready.`,
    items: [
      {
        title: 'Notifications.',
        body: "No push, no email alerts yet. We'll bother you when it's ready.",
      },
      {
        title: 'Cities outside Denver.',
        body: 'The crawl is regional for now. Other cities will onboard later.',
      },
      {
        title: 'Artist following.',
        body: 'Follow an artist and we surface their upcoming shows so nothing slips by.',
      },
      {
        title: 'Price alerts.',
        body: "Watch a show and we'll ping you when it drops into your range.",
      },
    ],
  },

  makeItYours: {
    eyebrow: 'Make it yours',
    heading: 'Pick your drip.',
    lede: 'Nine themes, different genre flavors. Pick one now, switch it up later in Settings.',
  },

  youreIn: {
    eyebrow: "You're in",
    heading: 'One last thing.',
    headingAccent: "You'll be shaping the app.",
    lede1:
      "You're not just here to use the thing — you're here to make it better. When something changes, we'll ask what you think. When something breaks, we want to know.",
    lede2:
      "You'll notice a little tab on the right side of the app. Tap it and you'll see a feedback form. Did the app crash? Love a feature? Have an idea for something new? Let us know.",
    personalAskLabel: 'One ask, from me to the homies',
    personalAskBody:
      "Most shows won't have a price listed. Yet. That's where you come in. Use the app to look up some shows (maybe buy a ticket) and submit the price. Bother a couple people to cross check what you saw, put the app through its paces. The more prices that are available the more real the app starts to feel when it launches.",
  },
}
