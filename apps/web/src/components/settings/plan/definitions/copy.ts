// All customer-facing strings for the settings "Your plan" card.
// Copy is lifted from the locked #780 lifecycle matrix
// (design_handoff_monetization_lifecycle/lifecycle-plan-cards.jsx), the #782
// past-due extension (design_handoff_monetization_failure_a11y_microcopy/
// lifecycle-plan-cards.jsx), and the #781 gifted plan card
// (design_handoff_monetization_tier_states/monetization-founder-gifted.jsx).
// Prices and tier names are data — they live in the tier-picker constants.

export const PLAN_CARD_COPY = {
  ariaLabel: 'Your plan',

  pastDue: {
    chip: 'Payment failed',
    eyebrow: (price: string) => `${price} / month · retrying`,
    headline: 'Heads up — your card got declined.',
    body: (tierName: string, periodEnd: string | null) =>
      `${tierName}'s still on. We'll keep retrying for about a week — pop in a fresh card and nothing changes.` +
      (periodEnd
        ? ` If it can't go through by ${periodEnd}, ${tierName} pauses.`
        : ` If it can't go through, ${tierName} pauses.`),
    punchline: '—— No drama. It just needs a working card.',
    railLabel: (tierName: string, periodEnd: string | null) =>
      periodEnd
        ? `${tierName} pauses ${periodEnd} if the card isn't fixed`
        : `${tierName} pauses if the card isn't fixed`,
    railSub: 'Stripe is retrying the charge',
    updateCardCta: 'Update card',
    manageCta: 'Manage subscription',
  },

  gifted: {
    betaChip: 'Beta',
    eyebrow: 'Lifetime · on us',
    headline: 'Premium. On the house.',
    body: "You're comped for life. Your beta seat covers everything Premium — Watching, follows, alerts, price drops, the lot. There's no card on file and no payment relationship to manage. Nothing for you to do here but enjoy it.",
    punchline: "—— You were here first. We don't forget that.",
    discoverCta: 'See what Premium unlocks',
  },

  trial: {
    chip: 'Trial',
    early: {
      eyebrow: (trialDay: number, trialLength: number) =>
        `Day ${trialDay} of ${trialLength} · no card yet`,
      headline: 'Trying Premium.',
      body: (daysLeft: number) =>
        `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left to see what sticks. No card on file — we'll nudge you before it ends. Cancel and you lose nothing.`,
      punchline: '—— No surprise charges. Promise.',
      cta: 'Lock in Premium',
    },
    endsTomorrow: {
      eyebrow: 'Trial ends tomorrow · lock it in',
      headline: 'One day left on Premium.',
      body: 'Tomorrow the trial wraps and you drop to Free — alerts, follows, and price drops switch off. Keep them on for $5/mo.',
      punchline: '—— No card yet. Add one and nothing changes.',
      railLabel: 'Trial ends tomorrow',
      railSub: (trialDay: number, trialLength: number, endsAt: string | null) =>
        `Day ${trialDay} of ${trialLength}` +
        (endsAt ? ` · ends ${endsAt}` : ''),
      cta: 'Go Premium · $5/mo',
    },
    endsToday: {
      eyebrow: 'Trial ends today · lock it in',
      headline: 'Last day on Premium.',
      body: "Your trial ends today. After that you're on Free and the alerts, follows, and price drops go quiet. Lock it in and they don't.",
      punchline: "—— It's $5/mo. Cancel any time, lose nothing.",
      railLabel: 'Trial ends today',
      railSub: 'No card on file yet',
      cta: 'Go Premium · $5/mo',
    },
  },

  cancelGrace: {
    chip: 'Winding down',
    eyebrow: (tierName: string, periodEnd: string | null) =>
      periodEnd
        ? `${tierName} until ${periodEnd} · won't renew`
        : `${tierName} · won't renew`,
    headline: (tierName: string, periodEnd: string | null) =>
      periodEnd
        ? `${tierName} until ${periodEnd}.`
        : `${tierName} — winding down.`,
    body: (tierName: string, periodEnd: string | null) =>
      `You canceled — no hard feelings. You keep everything ${tierName}` +
      (periodEnd
        ? ` until ${periodEnd}, then you roll to Free.`
        : ` until the period ends, then you roll to Free.`) +
      " You won't be charged again.",
    punchline: '—— Changed your mind? One tap puts it right back.',
    railLabel: (periodEnd: string | null) =>
      periodEnd
        ? `Auto-renew off · access ends ${periodEnd}`
        : 'Auto-renew off',
    railSub: 'Nothing else will be charged',
    resubscribeCta: 'Resubscribe',
    manageCta: 'Manage subscription',
  },

  activeSupporter: {
    eyebrow: (price: string, periodEnd: string | null) =>
      `${price} / month` + (periodEnd ? ` · renews ${periodEnd}` : ''),
    headline: '$2 a month. Thanks.',
    body: "Your history and calendar exports are on, and the badge is live. You're chipping in for the stuff we run on existing infrastructure.",
    punchline: "—— Want follows and alerts too? Premium's a tap away.",
    manageCta: 'Manage subscription',
  },

  activePremium: {
    eyebrow: (price: string, periodEnd: string | null) =>
      `${price} / month` + (periodEnd ? ` · renews ${periodEnd}` : ''),
    headline: "Premium. You're in.",
    body: 'Follows, alerts, price drops — the stuff that actually costs us money to run. All yours.',
    punchline: '—— More coming. Quietly.',
    manageCta: 'Manage subscription',
  },

  activeFounder: {
    eyebrow: (price: string, periodEnd: string | null) =>
      `Locked ${price} / month` + (periodEnd ? ` · renews ${periodEnd}` : ''),
    headline: 'Founder. Locked in.',
    body: '$3 a month, never goes up. You showed up at the start — even when we charge new users double.',
    punchline: "—— We don't forget that.",
    manageCta: 'Manage subscription',
  },

  free: {
    eyebrow: 'On the house',
    headline: 'Free. The whole point.',
    body: "Browse, search, save shows, submit prices — all included. Premium's here whenever you want the alerts and history back.",
    punchline: '—— No card, no commitment, no FOMO emails.',
    cta: 'See the tiers',
  },

  freePostTrial: {
    chip: (endedAt: string | null) =>
      endedAt ? `Trial ended · ${endedAt}` : 'Trial ended',
    eyebrow: 'Back on Free',
    headline: 'Your trial ended.',
    body: "The 14 days are up and you're on Free. Save shows, browse, submit prices — all still here. Want the alerts, follows, and history back?",
    punchline: '—— No charge happened. Upgrade whenever you like.',
    cta: 'Upgrade to Premium',
  },

  freePostCancel: {
    // PlanState doesn't carry the previous paid tier (the API collapses any
    // cancelled tier to plan 'free'), so this copy must stay tier-neutral.
    chip: (endedAt: string | null) =>
      endedAt ? `Plan ended · ${endedAt}` : 'Plan ended',
    eyebrow: 'Back on Free',
    headline: "You're on Free now.",
    body: (endedAt: string | null) =>
      (endedAt ? `Your plan wrapped on ${endedAt}. ` : 'Your plan wrapped. ') +
      'Browsing, saved shows, and submitting prices are still yours — always. The alerts, follows, and history are napping.',
    punchline: "—— Door's open. Your follows are safe for 90 days.",
    cta: 'Rejoin a plan',
  },

  freeChip: 'Free',

  errors: {
    portal: "Couldn't open subscription management. Try again in a moment.",
    resubscribe: "Couldn't restart your plan. Refresh and try again.",
  },
} as const
