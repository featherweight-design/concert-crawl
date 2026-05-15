export const ONBOARDING_COPY = {
  founderNote: {
    eyebrow: 'A note from the maker',
    heading: 'Hey — thanks for trying this thing.',
    p1: "I'm Hugh. I go to a lot of shows. Concert Crawl is the tool I always wanted: an honest place to see what's playing, what it costs, and whether it's worth the trip.",
    p2: "This is a private beta. Lots of edges are still rough. Some screens are empty because the data isn't there yet. Some prices are missing because we couldn't pull a real one — and we'd rather say that than make one up.",
    p3: "You're here early on purpose. Tell me what works, what's confusing, what's missing. I'll read all of it. The product will change because of it.",
  },

  howItWorks: {
    eyebrow: 'How this works',
    heading: 'Honest by design.',
    lede: "Two minutes on what to expect from the prices, the listings, and what we'll never do.",
    rows: [
      {
        kicker: '01',
        title: "We crawl, we don't sell.",
        body: "Concert Crawl reads public listings from venues and ticketers. We don't sell tickets and we don't take a cut. Tap a price, you go to the source.",
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
          "Directly from the venue — that's the gold standard. No markup.",
      },
      {
        label: 'COMMUNITY',
        kind: 'community' as const,
        description: 'Reported by a fan who was there. Confirmed by others.',
      },
      {
        label: 'RESALE',
        kind: 'resale' as const,
        description:
          "A marketplace listing — secondary market, not face value. We'll flag it.",
      },
    ],
    noPrice: "If we can't find a price, we'll say so instead of making one up.",
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
    ],
  },

  whatItDoesntYet: {
    eyebrow: 'Not yet',
    heading: "What's missing — on purpose.",
    lede: 'Better to be straight with you than to ship something that pretends. Things on this list are coming, not abandoned.',
    items: [
      {
        title: 'Notifications.',
        body: "No push, no email alerts yet. We'll add them after we earn the right to interrupt you.",
      },
      {
        title: 'Cities outside Denver.',
        body: 'The crawl is regional for now. Other metros come once the system is solid.',
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
    heading: 'Pick your look.',
    lede: 'Nine themes. Pick the one that feels right — you can always change it in Settings.',
  },

  youreIn: {
    eyebrow: "You're in",
    heading: 'One last thing.',
    headingAccent: "You'll be shaping the app.",
    lede1:
      "You're not just here to use the thing — you're here to make it better. When something changes, we'll ask what you think. When something breaks, we want to know.",
    lede2:
      "The Give Feedback button lives in your menu — always there, never buried. Tap it and you'll see a quick category picker and a free-form message field. Thirty seconds. I read every one.",
    personalAskLabel: 'One ask, from me',
    personalAskBody:
      "Most shows won't have a price listed yet — that's the part you can fix. When you buy a ticket, take ten seconds to report what you paid. Two fans confirming a number is all it takes to make a price real for everyone else.",
  },
}
