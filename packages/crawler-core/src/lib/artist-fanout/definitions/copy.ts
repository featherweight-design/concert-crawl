// Customer-facing push/tray copy for the new-show fan-out (#763 eng spec
// §10.1), which now covers follows from every source rather than only
// Spotify-synced ones. Strings are lifted verbatim from the locked design
// mock (design/design_handoff_spotify_sync/push-alert.jsx):
//
//   autoOn:    "Big Head Todd: new Denver date"
//              "Fillmore · Oct 12. Added to your Watching."
//   highlight: "Big Head Todd: new Denver date"
//              "Fillmore · Oct 12. Want in? Tap to watch."
//
// The body variant is keyed off the user's resolved autoWatch state (design
// lock): auto-watch users are told the show is already on their Watching
// list; highlight-only users get the tap-to-watch invite. A follower with no
// stored preference resolves to the default, false, so they always get the
// invite — following must never silently mutate someone's Watching list.
//
// The batch strings cover a run that claimed several shows for one user. A
// nightly crawl can land eight of them inside ninety seconds, and eight
// separate pushes is the fastest way to get notifications switched off, so
// delivery collapses into one. `batchTitle` counts ARTISTS, not shows: two
// dates from the same act would otherwise read "1 artists".

export const newShowCopy = {
  title: (artist: string): string => `${artist}: new Denver date`,
  autoWatchBody: (venueName: string, dateLabel: string): string =>
    `${venueName} · ${dateLabel}. Added to your Watching.`,
  highlightBody: (venueName: string, dateLabel: string): string =>
    `${venueName} · ${dateLabel}. Want in? Tap to watch.`,
  batchTitle: (artistCount: number): string =>
    `${artistCount} artists you follow just booked Denver`,
  multiDateTitle: (artist: string): string => `${artist}: new Denver dates`,
  batchAutoWatchBody: (showCount: number): string =>
    `${showCount} new shows, all added to your Watching.`,
  batchHighlightBody: (showCount: number): string =>
    `${showCount} new shows. Want in? Tap to watch.`,
} as const

const DATE_LABEL_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
})

// '2026-10-12' → 'Oct 12' (mock format). events.date is a Denver-local
// calendar date string, so it is formatted as a plain calendar date in UTC —
// same convention as the digest's dateLabel in spotify-weekly.ts.
export const newShowDateLabel = (dateStr: string): string => {
  const parsed = Date.parse(`${dateStr}T00:00:00Z`)
  if (Number.isNaN(parsed)) return dateStr
  return DATE_LABEL_FORMAT.format(new Date(parsed))
}
