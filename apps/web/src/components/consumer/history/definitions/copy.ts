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
    // The third sub-tab (native following). "Artists" is the locked term for
    // the people you follow, the same way Watching is the term for shows.
    artists: 'Artists',
    // The follow count rides the accessible NAME rather than being announced
    // as a node of its own beside the label, so a screen reader hears one
    // thing ("Artists, 7") where the eye sees a label and a small number.
    tabCountAria: (label: string, count: number) => `${label}, ${count}`,
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

  // The ⋯ on a row (edit-concerts handoff COPY.md, addendum 3 boards
  // past-menu-m, upcoming-menu-m, upcoming-menu-d). The sublines show on the
  // phone sheet only.
  menu: {
    trigger: (artist: string) => `More options for ${artist}`,
    open: 'Open the show page',
    openSub: "Tickets, lineup and who's going.",
    share: 'Share this night',
    shareUpcoming: 'Share this show',
    shareSub: 'The poster card, ready to send.',
    remove: "Didn't make it? Remove",
    removeUpcoming: 'Not going anymore',
    removeUpcomingSub:
      'It goes back to Watching. Your crews stop seeing you there.',
  },

  empty: {
    // The B+ empty card's eyebrow (`bp-s-empty_concerts_m`). Uppercased by CSS.
    eyebrow: 'Concerts',
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
    // Verbatim from addendum-2 concerts-round-stamps: eyebrow, title and link.
    eyebrow: (year: number) => `PASSPORT · ${year}`,
    headline: 'Your Passport',
    // No genre, no third segment: HistoryHeader drops its genre tile the same
    // way, and a bare dash beside real stats reads as a rendering bug.
    // "4 nights · 4 venues" and nothing else: the boards draw no top genre.
    summary: (nights: number, venues: number) =>
      [
        `${nights} ${nights === 1 ? 'night' : 'nights'}`,
        `${venues} ${venues === 1 ? 'venue' : 'venues'}`,
      ].join(' · '),
    link: 'Open it →',
  },

  // The rail entry that opens the Add sheet (edit-concerts COPY.md "Add row").
  // `since` is data from `recordsStartLabel()`, never typed here.
  addRow: {
    title: 'Add a show you went to',
    sub: (since: string) => `Stamp past nights, back to ${since}`,
  },

  // The Add sheet (COPY.md "Add a show you went to"; addendum 3 item 33 for
  // `loadFailed`, `retry` and `clearSearch`). `since` and `SINCE` come from
  // `recordsStartLabel()` and `recordsStartShort()`.
  add: {
    eyebrow: 'Concerts',
    title: 'Add a show you went to',
    subtitle: 'Find the night, tap I went, and it gets its stamp.',
    done: 'Done',
    searchPlaceholder: 'Artist or venue',
    clearSearch: 'Clear search',
    scopeAria: 'Which shows to list',
    scopeAll: 'All Denver',
    scopeVenues: 'My venues',
    scopeFollows: 'Artists I follow',
    recordsLead: (since: string) => `Our records start in ${since}.`,
    recordsRest:
      " Shows before then aren't in Concert Crawl, so they can't get a stamp.",
    resultCount: (count: number) =>
      `${count} ${count === 1 ? 'SHOW' : 'SHOWS'}`,
    resultsFooter: (artist: string, since: string) =>
      `That's every ${artist} show in Denver since ${since}.`,
    endDivider: (since: string) => `THE START OF OUR RECORDS · ${since}`,
    endLine:
      "Nothing before this. Older nights aren't in Concert Crawl, so they can't get a stamp.",
    emptyTitle: 'Not in our records.',
    emptyBody: (since: string) =>
      `We only have Denver shows from ${since} on. If it was more recent, try just the artist or just the venue.`,
    loadFailed: "Couldn't load shows.",
    retry: 'Try again',
    // The whole list failing to load (`add-error-m`): the red tile, an eyebrow,
    // a headline and a reassurance. A later page failing keeps `loadFailed`.
    errorEyebrow: "Couldn't load",
    errorTitle: "Couldn't load past shows.",
    errorBody: 'Check your connection. Nothing you stamped is lost.',
    // A scope with nothing in it (`add-my-venues-empty-m`). The follows twin is
    // not drawn; it takes the same shape.
    emptyVenuesTitle: 'No venues yet.',
    emptyVenuesBody:
      'My venues are the ones in your Concerts. Stamp a night from All Denver and its venue shows up here.',
    emptyFollowsTitle: 'No artists yet.',
    emptyFollowsBody:
      'Artists you follow show up here. Follow one and their past nights land in this list.',
    showAll: 'Show All Denver',
    // The end of a scoped list (addendum 3 README 35), in place of the records
    // divider that belongs to All Denver.
    endLineVenues: "That's every past show at your venues.",
    endLineFollows: "That's every past show by artists you follow.",
  },
} as const;
