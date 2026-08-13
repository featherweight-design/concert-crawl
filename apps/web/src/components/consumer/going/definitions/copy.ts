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
    pastNo: "Didn't make it",
    ariaGoing: 'Going to this show',
    ariaNotGoing: 'Mark that you are going to this show',
    stateChangeGoing: 'Marked as going',
    stateChangeReleased: 'No longer going',
  },
  // The going-vs-watch distinction lives in the shared CCTip registry under
  // `going-vs-watch`, not here: it is the same explanation on every surface
  // that draws the pair, and the handoff authors it as a two-row `defs` panel.
  nudge: {
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
  error: {
    retry: "Didn't save. Tap to retry",
    // Names what survived, so a failed commit doesn't read as losing the watch.
    survived: "We couldn't reach the server. Your watch is safe.",
  },
} as const
