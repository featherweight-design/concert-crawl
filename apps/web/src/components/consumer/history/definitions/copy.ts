// Every customer-facing string on the Concerts surface (#70, #1357).
// Sourced from design_handoff_concert_history/history-screens.jsx and
// history-routes.jsx.
//
// The identifier stays `HISTORY_COPY` and the route stays `/history` on purpose
// (#1357): the entitlement key, the API route and the ICS filename all carry
// `history`, and renaming the constant to chase the label would touch far more
// than the words. Only what the customer reads says "Concerts".
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
    concerts: 'Concerts',
  },

  // The two halves of the attendance list. They carry the tense the tab label
  // deliberately doesn't, so a show you're going to has somewhere to sit.
  sections: {
    upcoming: 'Upcoming',
    past: 'Past',
    upcomingEmpty: 'Nothing ahead of you yet.',
    pastEmpty: 'Nothing behind you yet.',
  },

  header: {
    range: 'all time',
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
    // (the Watching row, SmallEventRow) — submitted prices carry cents.
    paid: (amount: number) => `paid $${Math.round(amount)}`,
  },

  empty: {
    headline: 'No nights on the books yet.',
    body: "Tap I'm going! on a show and it lands here, first as a plan, then as a keepsake.",
    cta: "Browse tonight's shows",
  },

  locked: {
    headline: 'Keep the nights.',
    body: "Every show you tap I'm going! lands here, the ones ahead of you and the ones behind. Same artist art, same dates, and you can export the lot to your calendar.",
    cta: (tierName: string) => `Pick ${tierName}`,
    // Used only if the matrix somehow exposes no purchasable lane for the
    // feature — the picker still opens, it just can't promise which plan.
    ctaFallback: 'See the plans',
    footer:
      'Free tier keeps everything else. No paywalls in the way of seeing shows.',
  },

  calendar: {
    label: 'Export to calendar',
    detail: (count: number) => `${count} ${count === 1 ? 'night' : 'nights'}`,
    detailEmpty: 'Nothing to export yet',
    badge: '.ics',
    downloading: 'Preparing…',
    failed: "Couldn't build the file. Try again.",
    fileName: 'concert-crawl-history.ics',
  },

  passport: {
    headline: 'Your stamp book.',
    summary: (nights: number, venues: number, topGenre: string | null) =>
      `${nights} ${nights === 1 ? 'night' : 'nights'} · ${venues} ${
        venues === 1 ? 'venue' : 'venues'
      } · ${topGenre ?? '—'}`,
    link: 'See your Passport →',
  },
} as const
