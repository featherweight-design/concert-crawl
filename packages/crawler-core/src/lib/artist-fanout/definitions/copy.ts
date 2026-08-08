// Customer-facing push/tray copy for the Spotify new-show fan-out (#763
// eng spec §10.1). Strings are lifted verbatim from the locked design mock
// (design/design_handoff_spotify_sync/push-alert.jsx):
//
//   autoOn:    "Big Head Todd: new Denver date"
//              "Fillmore · Oct 12. Added to your Watching."
//   highlight: "Big Head Todd: new Denver date"
//              "Fillmore · Oct 12. Want in? Tap to watch."
//
// The body variant is keyed off the user's per-connection autoWatch state
// (design lock): auto-watch users are told the show is already on their
// Watching list; highlight-only users get the tap-to-watch invite.

export const newShowCopy = {
  title: (artist: string): string => `${artist}: new Denver date`,
  autoWatchBody: (venueName: string, dateLabel: string): string =>
    `${venueName} · ${dateLabel}. Added to your Watching.`,
  highlightBody: (venueName: string, dateLabel: string): string =>
    `${venueName} · ${dateLabel}. Want in? Tap to watch.`,
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
