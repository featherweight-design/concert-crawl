// All customer-facing strings for the tier picker (design handoff
// monetization_tier_states R6 + price-promise microcopy from brief #782).
// Prices and tier names live in constants.ts — they're data, not copy.

export const TIER_PICKER_COPY = {
  header: {
    eyebrow: 'Upgrade · pick a lane',
    title: 'Pick a lane.',
    sub: "We run on infrastructure, not VC money. Subscriptions cover what costs us money to run. That's it.",
    loggedOutEyebrow: 'Save a show · sign in',
    loggedOutTitle: "Save the ones you can't miss.",
    loggedOutSub:
      "Watching's free — you just need an account. Pick a tier to get started, or sign in if you're already in.",
    tiersCode: (count: number) => `${count} tiers`,
  },
  signIn: {
    prompt: 'Already have an account?',
    link: 'Sign in →',
  },
  footer: {
    desktop: 'Cancel any time · billed monthly · Stripe handles cards',
    mobile: 'Tap a tier to compare · cancel any time · Stripe handles cards',
  },
  card: {
    yourPlan: 'Your plan',
    yourPlanFounder: 'Your plan · locked $3/mo',
    yourPlanInline: '· Your plan',
    popular: 'Popular',
    // Grandfather-everyone-forever promise (#782 §4, locked wording).
    // Founder's line reinforces its locked-$3 stamp rather than duplicating.
    pricePromise: {
      supporter: 'Whatever you pay, you pay. We never raise it.',
      premium: 'Whatever you pay, you pay. We never raise it.',
      founder: '$3 is $3. New folks may pay double someday — never you.',
    },
    founderPreLaunch: 'Opens at public launch',
  },
  scarcity: {
    claimed: (claimed: number, total: number) =>
      `${claimed} / ${total} claimed`,
    daysAndHoursLeft: (days: number, hours: number) =>
      `${days}d ${hours}h left`,
    hoursLeft: (hours: number) => `${hours}h left`,
  },
  cta: {
    // current-plan
    youAreOnFree: "You're on Free",
    manageSubscription: 'Manage subscription',
    // logged-out
    signUpFree: 'Sign up free',
    pickSupporter: 'Pick Supporter · $2',
    pickPremium: 'Pick Premium · $5',
    claimFounderLoggedOut: 'Claim Founder · $3',
    // signed-in defaults
    switchToFree: 'Switch to Free',
    becomeSupporter: 'Become a Supporter',
    startTrial: 'Start 14-day free trial',
    claimFounder: 'Claim Founder pricing',
    // state-specific
    downgradeToFree: 'Downgrade to Free',
    upgradeToPremium: 'Upgrade to Premium',
    switchToFounder: 'Switch to Founder · $3',
    switchTo: (tierName: string) => `Switch to ${tierName}`,
    alreadyViaFounder: 'Already yours, via Founder',
  },
  tiers: {
    free: {
      tagline: 'The whole point. Always free.',
      rationale: 'No backend cost to scale, no reason to charge.',
      features: [
        'Browse, search, filter every show',
        "Save shows you're watching",
        'See community-submitted prices',
        'Submit prices yourself',
      ],
    },
    supporter: {
      tagline: 'Stuff we can run without scaling.',
      rationale: "Existing infrastructure. You're just chipping in.",
      features: [
        'Everything in Free',
        'Supporter badge on your profile',
        'The warm, smug glow of keeping us alive',
      ],
      badgeOnlyNote: "No Premium unlocks — that's the point.",
    },
    premium: {
      tagline: 'Stuff that actually costs us money.',
      rationale:
        'Notification workers, email at volume, price polling, Spotify API.',
      features: [
        'Everything in Free',
        'Concert history — shows you attended',
        'Calendar export — Apple + Google',
        'Follow artists + new-show alerts',
        'Price-drop alerts + Spotify sync',
      ],
      futureFeature: 'More coming',
    },
    founder: {
      tagline: 'Full Premium. Permanent discount.',
      rationale: 'First 100 subscribers. Claimable at public launch.',
      features: [
        'Everything in Premium',
        '$3/mo — never goes up, ever',
        'Founder badge (first 100 only)',
      ],
      futureFeature: 'More coming',
    },
  },
  badges: {
    supporter: 'Supporter',
    premium: 'Premium',
    founder: 'Founder',
  },
  gifted: {
    eyebrow: 'Lifetime Premium · Beta',
    code: 'On us',
    beta: 'Beta',
    title: "You're already in.",
    body: "Lifetime Premium — on us. No tier to pick, no card to add, nothing to manage. You showed up early; that's the whole price.",
    signature: '—— Seriously. We owe you one.',
    perksEyebrow: 'Everything Premium, switched on',
    perks: [
      'Concert history — shows you attended',
      'Calendar export — Apple + Google',
      'Follow artists + new-show alerts',
      'Price-drop alerts + Spotify sync',
    ],
    footer: 'No card on file · nothing to cancel · just enjoy it',
    discover: "See everything you've got",
  },
  checkout: {
    eyebrow: 'Checkout',
    backToTiers: '← Back to tiers',
    payCta: 'Subscribe',
    processing: 'Processing…',
    startError: "Couldn't start checkout. Try again in a moment.",
    confirmError: "Payment didn't go through. Check your card and try again.",
    // Above-CTA legal block (#782 §6.1) — stacked mono micro-rows, no
    // "subject to change" disclaimer anywhere (it would undermine the
    // grandfather-everyone-forever promise).
    legal: {
      ariaLabel: 'Terms and billing information',
      agreePrefix: 'By continuing you agree to our ',
      termsLink: 'Terms',
      privacyLink: 'Privacy',
      refundLink: 'Refund policy',
      autoRenew:
        'Auto-renews monthly. Cancel anytime — keeps working till the period ends.',
      // Conditional on server-resolved SCA region (EEA + UK, spec §1.7).
      scaNotice: 'Your bank may ask to confirm this payment.',
    },
    // Bottom mono rail — splits trust (Stripe / card privacy) from the
    // cancel reassurance so each reads (#782 §6.2).
    rail: {
      stripe: 'Stripe handles your card · we never see it',
      cancel: 'Cancel anytime, lose nothing',
    },
  },
  entry: {
    compare: 'Compare plans →',
    ariaLabel: 'Tier picker',
  },
  // Founder post-claim seat reveal (#781 §3.3, design table Table 2).
  founderClaim: {
    eyebrow: 'Founder · claimed',
    seatCode: (seat: number, total: number) => `${seat}/${total}`,
    seatLabel: 'Your seat',
    seatNumber: (seat: number) => `#${seat}`,
    seatTotal: (total: number) => `of ${total}`,
    headline: 'Founder. Locked in.',
    body: "You got in before the rest. $3 a month for as long as you're here — even when everyone else is paying double.",
    priceStamp: '$3',
    priceStampUnit: '/mo',
    priceStampEyebrow: 'Locked forever',
    cta: 'Take me in.',
    footerHint: 'Routing you to Settings · Plan',
    ariaLabel: 'Founder seat claimed',
  },
  errors: {
    portal: "Couldn't open subscription management. Try again in a moment.",
  },
  aria: {
    tierDetails: (tierName: string) => `${tierName} tier details`,
  },
} as const
