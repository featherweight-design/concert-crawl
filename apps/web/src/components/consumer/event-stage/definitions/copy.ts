// The event page's stage (B+ B8): the countdown eyebrow on the tilted card and
// the date and venue line under the genre chips. Both render in mono caps, so
// the strings are sentence case and CSS does the uppercasing.
export const EVENT_STAGE_COPY = {
  countdown: {
    tonight: 'Tonight',
    tomorrow: 'Tomorrow',
    daysAway: (days: number) => `${days} days away`,
    // The past twin (addendum 3, rule 3).
    yesterday: 'Yesterday',
    daysAgo: (days: number) => `${days} days ago`,
  },
  meta: (date: string, venue: string) => `${date} · ${venue}`,
  // The postponed show's meta line when the old date is struck and the new one
  // is not known yet (more-st-ev_post_m).
  newDateTba: 'New date TBA',
} as const;
