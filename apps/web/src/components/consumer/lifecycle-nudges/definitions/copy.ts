// All customer-facing strings for the lifecycle nudges (#780 design
// handoff monetization_lifecycle — strings verbatim from the design
// table, punctuation exact). Numeric/data constants live in constants.ts.

export const LIFECYCLE_NUDGES_COPY = {
  takeover: {
    eyebrow: 'Premium trial · done',
    code: '14/14',
    headline: "Trial's done. Pick a lane.",
    subhead:
      "Your 14 days of Premium just wrapped. You're on Free now. Browsing and your saved shows stay put; alerts, follows, and history are paused. Pick where you want to be.",
    dismissLink: 'Keep browsing on Free →',
    ariaLabel: 'Trial ended, pick a plan',
    dismissAria: 'Dismiss',
  },
  banner: {
    title: 'Trial ends tomorrow',
    sub: 'Lock it in?',
    cta: 'Go Premium',
    dismissAria: 'Dismiss trial reminder',
  },
  // Past-due banner (#775, PR 4.3) — strings verbatim from the design
  // property table (docs/superpowers/design-tables/past-due-surfaces.md).
  pastDueBanner: {
    headline: 'Your card got declined',
    sub: 'Give it a refresh?',
    cta: 'Update card',
    dismissAria: 'Dismiss payment notice',
    regionAria: 'Payment notice',
  },
} as const
