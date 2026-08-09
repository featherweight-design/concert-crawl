// Customer-facing strings for the first-watch follow nudge (native following,
// PR 10). One card, two placements: in place of the Watch strip on event
// detail, and floating everywhere else.
//
// The artist's name is DATA and never lives here — only the sentence it sits
// in does.
//
// ⚠️ Nothing here may say that following moves shows into Watching. Watching
// is the show, following is the artist, and this card sits at the exact moment
// a user could most easily confuse the two. The body's job is to name what
// following adds that the watch they just made does not.

export const FOLLOW_NUDGE_COPY = {
  // The in-place card stands where the Watch strip stood, so it owes the
  // confirmation the strip would have given. Deliberately the same sentence
  // the strip's own on-state carries (CONSUMER_COPY.watchShowButton
  // .watchStatusOn) — one fact, one wording, however it is reached.
  watchConfirmed: "You're watching this one.",
  // ⚠️ There is deliberately no eyebrow. The handoff's variant A carried a
  // "Nice pick" mono line, but that card had no confirmation row above it.
  // Ours does, and two reactions to the same tap is the exact collision
  // Design's own variant C note calls out ("two layers saying one thing").
  // The confirmation states a fact the user needs; the eyebrow only
  // congratulated them for a choice they had already made.
  title: (name: string) => `Follow ${name}?`,
  // Says what following adds, and rules out the fear it creates. "No
  // tour-wide noise" is the house phrasing (see FOLLOWING_COPY.searchRailBody)
  // and is never softened to "spam".
  body: "You'll hear about their next Denver date without checking back. No tour-wide noise.",
  dismiss: 'Not right now',
  // Swaps in for `dismiss` once the follow lands. The card stays up so the
  // confirmation is not yanked out from under the finger, and at that point
  // "Not right now" would be answering a question already answered.
  close: 'Done',
  dismissAria: 'Dismiss the follow suggestion',
  ariaLabel: 'Follow suggestion',
} as const
