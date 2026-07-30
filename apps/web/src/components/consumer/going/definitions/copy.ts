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
  support: {
    default: 'Going saves the night · Watch tracks the price.',
    going: "We'll add this to your history.",
  },
  error: {
    // Closes the READINESS 🎭 gap — the handoff drew no error state.
    failed: "Couldn't save that. Try again.",
  },
} as const
