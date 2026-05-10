export const copy = {
  // ── Browse — no-data (tonight / no filter active) ──────────────────
  emptyTonightEyebrow: 'Tonight',
  emptyTonightTitle: 'No shows tonight, grandpa.',
  emptyTonightBody:
    'Slow night on the calendar. Browse the rest of the week — usually picks up by the weekend.',
  emptyTonightCta: 'View this week',

  // ── Browse — filtered (filter active, zero results) ────────────────
  emptyFilteredEyebrow: 'Filtered',
  emptyFilteredTitle: 'Crickets.',
  emptyFilteredBody:
    'These filters are airtight. Drop one, or stretch the dates a few days either side and try again.',
  emptyFilteredCta: 'Clear filters',

  // ── Browse — calendar (selected day has no events) ─────────────────
  emptyCalEyebrow: 'No shows',
  emptyCalTitle: 'Nothing on this day.',
  emptyCalBody: 'Try a different day or drop a filter.',

  // ── Venue ──────────────────────────────────────────────────────────
  venueEmptyEyebrow: 'Upcoming',
  venueEmptyTitle: 'Nothing booked yet.',
  venueNoShows:
    'No shows are scheduled at this venue right now. Check back soon.',

  // ── Watching ───────────────────────────────────────────────────────
  watchingEmptyEyebrow: 'Watching',
  watchingEmptyTitle: 'Empty queue.',
  watchingEmptyBody:
    "Bookmark a show and we'll watch its price for you — drops, spikes, sell-outs. We're patient.",
  watchingEmptyCta: "Browse tonight's shows",

  // ── Search ─────────────────────────────────────────────────────────
  searchNoResultsEyebrow: 'No results',
  searchNoResultsBody: "Try another spelling, or browse what's on tonight.",
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
} as const
