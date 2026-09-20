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
  // Retry is the whole offer. The step is skippable from the rail above and
  // the button below already reads "Continue without following" at zero picks,
  // so a third way out stated here is noise in the one state that needs a
  // clear single action.
  errorBody: 'Something went wrong on our end. Give it another go.',
  errorRetry: 'Try again',

  // ── In-step search ──────────────────────────────────────────────────
  // The field's own placeholder. A name, not "search artists": the grid above
  // is the artists we picked, and this is the one the visitor had in mind that
  // we missed. The label carries the rest for a screen reader.
  searchPlaceholder: 'Type a name',
  searchFieldLabel: 'Search artists by name',
  // The field's own X. Distinct from `searchBack` below, which is the labelled
  // control in the no-results body: both return to the grid, and two buttons
  // reading "Back to suggestions" is the same name twice in a rotor listing.
  searchCloseLabel: 'Close search',
  // Before two characters are typed. A prompt, not an empty state — nothing
  // has failed and nothing is missing.
  searchRestTitle: 'Who are you looking for?',
  searchRestBody:
    'Anyone who has played Denver is in here, whether or not they have a date coming up.',
  // Every match was already followed. Deliberately NOT "nobody by that name",
  // which is untrue about an artist the visitor follows, and deliberately not
  // a claim of completeness either: the endpoint answers with its closest
  // three, so a narrower name may still turn up someone new.
  searchAllFollowedTitle: 'You already follow those.',
  searchAllFollowedBody:
    'Every close match is in your follows already. Try a more specific name, or go back to the suggestions.',
  searchNoneTitle: 'Nobody by that name.',
  searchNoneBody:
    "We only know acts billed on a Denver date we've crawled. Check the spelling, or go back to the suggestions.",
  searchBack: 'Back to suggestions',
  // Announced as the query narrows, so a screen reader hears the count change
  // without the rows being re-read.
  searchResultCount: (count: number) =>
    `${count} ${count === 1 ? 'artist' : 'artists'}`,
  // Announced when the field opens. Says where you are AND that the step is
  // unchanged, because the grid vanishing is the moment a tour feels lost.
  searchOpened: 'Searching artists. Your picks are kept.',
  /** The strip above the rail while the grid is off screen. */
  pickedCount: (count: number) => `Picked · ${count}`,
} as const
