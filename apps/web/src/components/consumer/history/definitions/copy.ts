// Every customer-facing string on the Concert History surface (#70).
// Sourced from design_handoff_concert_history/history-screens.jsx and
// history-routes.jsx.
//
// No tier is named in this file. Which plan unlocks History has already moved
// once (#1225), so every string that would say "Supporter" instead takes the
// tier name the caller resolved from unlockTierFor('concert-history'). The
// `Pick <tier>` CTA shape mirrors TIER_PICKER_COPY.cta.switchTo, and reads
// correctly for every tier name in TIER_DEFINITIONS.

export const HISTORY_COPY = {
  tabs: {
    // The container is "My shows"; the two sub-tabs keep the locked vocabulary.
    ariaLabel: 'My shows',
    watching: 'Watching',
    history: 'History',
    tierChip: (tierName: string) => `+ ${tierName}`,
  },

  header: {
    eyebrow: 'HISTORY',
    range: 'all time',
    tierChip: (tierName: string) => `+ ${tierName}`,
    since: (label: string) => `since ${label}`,
    stats: {
      nightsSingular: 'night',
      nightsPlural: 'nights',
      venuesSingular: 'venue',
      venuesPlural: 'venues',
      artistsSingular: 'artist',
      artistsPlural: 'artists',
      topGenre: 'top genre',
      topVenue: 'top venue',
      spent: 'spent',
    },
  },

  item: {
    // Whole dollars, matching every other consumer price surface
    // (WatchingItem, SmallEventRow) — submitted prices carry cents.
    paid: (amount: number) => `paid $${Math.round(amount)}`,
  },

  empty: {
    eyebrow: 'HISTORY',
    headline: "Nothing's behind you yet.",
    body: "Tap I'm going! on a show you've got tickets for. After the date, it lands here as a keepsake.",
    cta: "Browse tonight's shows",
  },

  locked: {
    headline: 'Keep the nights.',
    body: "Every show you tap I'm going! lands here after the date — same artist art, same dates, no work on your end. You also get a calendar feed you can subscribe to.",
    cta: (tierName: string) => `Pick ${tierName}`,
    // Used only if the matrix somehow exposes no purchasable lane for the
    // feature — the picker still opens, it just can't promise which plan.
    ctaFallback: 'See the plans',
    footer:
      'Free tier keeps everything else. No paywalls in the way of seeing shows.',
  },

  calendar: {
    label: 'Export to calendar',
    detail: (count: number) =>
      `${count} ${count === 1 ? 'night' : 'nights'} · iCal · Google · Apple`,
    detailEmpty: 'Nothing to export yet',
    badge: '.ics',
    downloading: 'Preparing…',
    failed: "Couldn't build the file. Try again.",
    fileName: 'concert-crawl-history.ics',
  },

  passport: {
    eyebrow: 'Passport',
    headline: 'Your stamp book.',
    summary: (nights: number, venues: number, topGenre: string | null) =>
      `${nights} ${nights === 1 ? 'night' : 'nights'} · ${venues} ${
        venues === 1 ? 'venue' : 'venues'
      } · ${topGenre ?? '—'}`,
    link: 'See your Passport →',
  },
} as const
