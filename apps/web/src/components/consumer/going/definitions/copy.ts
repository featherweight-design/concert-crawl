// Customer-facing copy for the "I'm going!" commitment surface (#70).
//
// Sourced from design_handoff_concert_history README §Voice + going-cta.jsx.
// The exclamation on `default` is deliberate and load-bearing — README §Voice:
// "with the exclamation — it's a commitment, not a checkbox". The prototype JSX
// dropped it; the README is the authority.

export const GOING_COPY = {
  // Names the block so the `?` has something to sit beside, rather than the
  // disc hanging alone under the button in dead space.
  eyebrow: {
    upcoming: 'Your move',
    past: 'That night',
  },
  button: {
    default: "I'm going!",
    going: 'Going',
    pastYes: (date: string) => `You went · ${date}`,
    // A past night you have not stamped yet: the same pill as the artist page's
    // "I went" (event_unmarked_m).
    pastNo: 'I went',
    ariaGoing: 'Going to this show',
    ariaNotGoing: 'Mark that you are going to this show',
    stateChangeGoing: 'Marked as going',
    stateChangeReleased: 'No longer going',
  },
  // The lines under the past button (event_unmarked_m, event_stamped_m).
  past: {
    hint: (venue: string) =>
      `Were you there? Tap it and the night lands in your Concerts with its ${venue} stamp.`,
    // The stamped pill on the artist page and the Add sheet (artist_past_m,
    // add_sheet_m); the unstamped one reads `button.pastNo`.
    wentPill: 'Went',
    removeLead: "Didn't make it?",
    removeLink: 'Remove it from Concerts',
    // The pill's name for assistive tech (addendum 3, item 33).
    ariaWent: (artist: string, date: string) => `I went to ${artist}, ${date}`,
  },
  // The going-vs-watch distinction lives in the shared CCTip registry under
  // `going-vs-watch`, not here: it is the same explanation on every surface
  // that draws the pair, and the handoff authors it as a two-row `defs` panel.
  nudge: {
    // Addendum 2 item 5: the heading stays the full question, with the day
    // count (`whenInDays`) after it. "Going? In N days." was README shorthand.
    heading: 'Going to this show?',
    whenTonight: 'Tonight.',
    whenTomorrow: 'Tomorrow.',
    whenInDays: (days: number) => `In ${days} days.`,
    support: 'Mark it so it lands in your Concerts.',
    yes: 'Yes, going',
    dismiss: 'Dismiss',
  },
  locked: {
    // Same label as `default` on purpose: the locked control is an invitation,
    // so it has to read as the thing you would get, not as a different thing.
    //
    // Neither line names the feature. "Part of Concerts" reads as a tab rather
    // than a promise, and the destination paywall (HISTORY_COPY.locked) already
    // sells this without naming a product. The tip beside the line does the
    // teaching; these two only say what it costs.
    aria: "I'm going! Requires a paid plan.",
    line: 'Needs a paid plan.',
  },
  // Taking a past night back out (edit-concerts handoff, COPY.md "Remove
  // confirm").
  remove: {
    title: "Didn't make it?",
    body: "Take it out of your Concerts. Its stamp comes off your Passport, your stats drop it, and your crews won't see you there.",
    confirm: 'Remove from Concerts',
    cancel: 'Cancel',
    keep: 'Keep it',
    // In flight and failed (addendum 3 boards remove-busy-m, remove-failed-m).
    busy: 'Removing…',
    retry: 'Try again',
    failed: "Couldn't remove it. Check your connection and try again.",
    footnoteConcerts: 'Changed your mind? Tap I went on the show page.',
    footnoteShowPage: 'Changed your mind? Tap I went again.',
  },
  toast: {
    removed: (artist: string) => `${artist} is out of your Concerts.`,
    undo: 'Undo',
    stamped: (artist: string) => `Stamped. ${artist} is in your Concerts.`,
    openPassport: 'Open Passport',
    // New, not in COPY.md (plan D7). Goes through copy-review.
    saveFailed: "Didn't save. Try again.",
    undoFailed: "Couldn't undo that. Open the show to add it back.",
  },
  error: {
    retry: "Didn't save. Tap to retry",
    // Names what survived, so a failed commit doesn't read as losing the watch.
    survived: "We couldn't reach the server. Your watch is safe.",
  },
} as const;
