// Customer-facing strings for the multi-select artist picker (native
// following, PR 8). Artist names, venue names and dates are DATA and never
// live here.
//
// The picker is a SELECTION surface, not a follow surface: nothing is written
// until the caller commits. So none of these strings may say "followed" in the
// past tense, and none may promise that following puts shows in your Watching
// (following surfaces dates; it moves nothing).
//
// The commit button and its sub-line belong to the CALLER, not the picker —
// onboarding owns its own CTA rail and a second button inside the grid would
// be two primaries on one screen. Those strings live in ONBOARDING_COPY.

export const ARTIST_PICKER_COPY = {
  // Names the group that wraps the checkbox tiles (ACC-05). Screen readers
  // announce it before the first tile, so it has to say what a tile IS before
  // "checkbox, not checked" makes any sense.
  groupLabel: 'Artists to follow',
  // Announced while the suggestions are in flight, so the skeleton tiles are
  // not just silence to a screen reader.
  loading: 'Loading artists',
  // The escape hatch under the grid. Deliberately "someone specific": the grid
  // above is a suggestion, and the thing a person reaches for when a
  // suggestion misses is a name they already had in mind.
  searchEscape: 'Search for someone specific',
  // Zero suggestions came back. Reads as a gap in OUR listings rather than a
  // bad choice by the user, because it is: we only know artists billed on a
  // Denver date we have crawled.
  emptyTitle: 'Nobody booked in that lane yet.',
  emptyBody:
    "Denver hasn't got an upcoming date in what you picked. Search for anyone by name instead, or come back once more shows land.",
  // A failed load is NOT the empty state. Both hand back zero artists, and
  // saying "nobody booked in that lane" when the request never landed blames
  // the listings for our own outage and leaves the reader nothing to do about
  // it. The diagnosis stays; the internals do not.
  errorTitle: "That list didn't load.",
  errorBody:
    'Something went wrong on our end. Search for anyone by name instead, or give it another go in a minute.',
} as const
