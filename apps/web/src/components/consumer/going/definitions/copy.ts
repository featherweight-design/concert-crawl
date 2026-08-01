// Customer-facing copy for the "I'm going!" commitment surface (#70).
//
// Sourced from design_handoff_concert_history README §Voice + going-cta.jsx.
// The exclamation on `default` is deliberate and load-bearing — README §Voice:
// "with the exclamation — it's a commitment, not a checkbox". The prototype JSX
// dropped it; the README is the authority.

export const GOING_COPY = {
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
  // The going-vs-watch distinction is real but secondary — it sits behind a
  // tooltip rather than a standing line, so the two CTAs aren't buried under
  // explanatory text.
  explainer: {
    triggerLabel: "What's the difference between going and watching?",
    content: 'Going saves the night · Watch tracks the price.',
  },
  nudge: {
    heading: 'Going to this show?',
    whenTonight: 'Tonight.',
    whenTomorrow: 'Tomorrow.',
    whenInDays: (days: number) => `In ${days} days.`,
    support: 'Mark it so it lands in your history.',
    yes: 'Yes, going',
    dismiss: 'Dismiss',
  },
  error: {
    // Closes the READINESS 🎭 gap — the handoff drew no error state.
    failed: "Couldn't save that. Try again.",
  },
} as const
