// The event page's stage (B+ B8): the countdown eyebrow on the tilted card and
// the date and venue line under the genre chips. Both render in mono caps, so
// the strings are sentence case and CSS does the uppercasing.
export const EVENT_STAGE_COPY = {
  countdown: {
    tonight: 'Tonight',
    tomorrow: 'Tomorrow',
    daysAway: (days: number) => `${days} days away`,
  },
  meta: (date: string, venue: string) => `${date} · ${venue}`,
} as const;
