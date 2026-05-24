export const copy = {
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
    'We haven’t found any scheduled shows for this venue yet. Check back soon.',

  // ── Watching ───────────────────────────────────────────────────────
  watchingEmptyEyebrow: 'Watching',
  watchingEmptyTitle: 'No shows, grandpa.',
  watchingEmptyBody:
    "Add a show to follow it. Soon, we’ll watch the price for you and notify you of drops, spikes, or sell-outs.",
  watchingEmptyCta: "Browse tonight's shows",

  // ── Search ─────────────────────────────────────────────────────────
  searchNoResultsEyebrow: 'No results',
  searchNoResultsTitle: 'Nothing under that name.',
  searchNoResultsBody:
    'No bookings right now. Try another spelling, or browse what’s on tonight.',
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
