// All customer-facing strings for the tier picker (design handoff
// monetization_tier_states R6 + price-promise microcopy from brief #782).
// Prices and tier names live in constants.ts — they're data, not copy.

export const TIER_PICKER_COPY = {
  header: {
    eyebrow: 'Upgrade · pick a lane',
    title: 'Pick a lane.',
    sub: "We run on infrastructure, not VC money. Subscriptions cover what costs us money to run. That's it.",
    // Keyed by the entry point that opened the picker, so the gate names the
    // thing the visitor just reached for. `default` covers every signed-out
    // entry that isn't a specific feature reach.
    loggedOut: {
      default: {
        eyebrow: 'Watching · free with an account',
        title: "Keep an eye on the ones you can't miss.",
        sub:
          'Watching is free. It just needs an account to save to. Start on Free; ' +
          'pick a lane later if you ever want to chip in.',
      },
      'logged-out-going': {
        eyebrow: 'Concert History · free with an account',
        title: 'Keep a record of every show you go to.',
        sub:
          "Saying you're going is free. It just needs an account to save to. " +
          'Start on Free; pick a lane later if you ever want to chip in.',
      },
      'logged-out-follow': {
        eyebrow: 'Following · free with an account',
        title: 'Never miss the next one they book.',
        sub:
          'Following is free. It just needs an account to save to. ' +
          'Start on Free; pick a lane later if you ever want to chip in.',
      },
      'logged-out-price': {
        eyebrow: 'Submitted prices · free with an account',
        title: 'Tell everyone what it actually cost.',
        sub:
          'Submitting a price is free. It just needs an account to attach it to. ' +
          'Start on Free; pick a lane later if you ever want to chip in.',
      },
      'logged-out-report': {
        eyebrow: 'Status reports · free with an account',
        title: 'Let the room know before they go.',
        sub:
          'Reporting is free. It just needs an account to stand behind it. ' +
          'Start on Free; pick a lane later if you ever want to chip in.',
      },
    },
    // Keyed the same way, for the reaches a SIGNED-IN visitor can hit. Only
    // entries specific enough to name get a variant; everything else keeps the
    // generic header above, which is what opening the picker from the account
    // menu should read as.
    signedIn: {
      // Committing a set of onboarding artist picks without the entitlement.
      // The sub-line's whole job is to answer the fear the button just
      // created: that backing out costs the picks already made.
      follow: {
        eyebrow: 'Following · Premium',
        title: 'Follow all of them at once.',
        sub: 'Following artists comes with Premium. Your picks are held while you decide, and nothing gets lost if you back out.',
      },
    },
    tiersCode: (count: number) => `${count} tiers`,
  },
  signIn: {
    prompt: 'Already have an account?',
    link: 'Sign in →',
  },
  footer: {
    desktop: 'Cancel any time · billed monthly',
    mobile: 'Tap a tier to compare · cancel any time',
  },
  card: {
    yourPlan: 'Your plan',
    yourPlanFounder: 'Your plan · locked $3/mo',
    yourPlanInline: '· Your plan',
    popular: 'Popular',
    // Grandfather-everyone-forever promise (#782 §4). The generic form applies
    // to every tier, so it is stated once on the footer rail rather than per
    // card. Founder keeps a line because its locked-$3 stamp says something the
    // generic promise does not.
    pricePromise: {
      founder: '$3 is $3. New folks may pay double someday. Never you.',
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
        'Watching: keep an eye on any show',
        'See community-submitted prices',
        'Submit prices yourself',
      ],
    },
    supporter: {
      tagline: 'Stuff we can run without scaling.',
      rationale: "Existing infrastructure. You're just chipping in.",
      features: [
        'Everything in Free',
        'Concert history: shows you attended',
        'Calendar export: Apple + Google',
        'Supporter badge on your profile',
      ],
      monoNote: 'Plus the warm, smug glow of keeping us alive.',
    },
    premium: {
      tagline: 'Stuff that actually costs us money.',
      // Spotify API used to close this list. It came out when sync dropped to
      // the mono aside below: naming it as a cost driver directly above a card
      // that treats it as fine print reads as two different stories about the
      // same feature. The three that remain are the real drivers.
      rationale: 'Notification workers, email at volume, price polling.',
      // ⚠️ Following is the HEADLINE benefit and Spotify sync is fine print.
      // That reversal is deliberate (native following, PR 10): Spotify caps us
      // at a handful of connected accounts, so a tier sold on sync is sold on
      // something most subscribers cannot switch on. Following is native,
      // uncapped, and works for everyone who pays on day one.
      features: [
        'Everything in Supporter',
        'Follow any artist, get their Denver dates',
        'New-show alerts: email + push',
        'Price-drop alerts',
      ],
      // The mono aside, not a feature row: sync is included and real, but the
      // seats are Spotify's to hand out and we are at the cap. Says the cap
      // out loud rather than "when a seat frees up", which promised a queue
      // that moves — Extended Quota is not a thing we can count on.
      monoNote: 'Spotify sync too, for the few seats Spotify gives us.',
      futureFeature: 'More coming',
    },
    founder: {
      tagline: 'Full Premium. Permanent discount.',
      rationale: 'First 100 subscribers. Claimable at public launch.',
      features: [
        'Everything in Premium',
        '$3/mo, never goes up, ever',
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
    body: "Lifetime Premium, on us. No tier to pick, no card to add, nothing to manage. You showed up early; that's the whole price.",
    signature: 'Seriously. We owe you one.',
    perksEyebrow: 'Everything Premium, switched on',
    // Same reversal as the Premium card above: following leads, and sync is
    // not paired onto a line where it reads as half the offer.
    perks: [
      'Concert history: shows you attended',
      'Calendar export: Apple + Google',
      'Follow any artist, get their Denver dates',
      'New-show and price-drop alerts',
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
        'Auto-renews monthly. Cancel anytime; it keeps working till the period ends.',
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
  // Payment failure surfaces (design table failure-surfaces.md, PR 4.4).
  // Verbatim copy contract — the word "fraud" NEVER appears user-facing,
  // and raw decline codes are never rendered.
  failure: {
    railEyebrow: 'Payment · declined',
    closeLabel: 'Close and return to plans',
    cardKeptNote: "Card on file kept. We'll reuse it on retry",
    secondary: 'Use a different card',
    categories: {
      insufficient_funds: {
        eyebrow: 'CARD DECLINED',
        code: '01',
        headline: 'Your bank said no.',
        body: 'It came back as insufficient funds. Nothing was charged. Try again, or drop in a different card.',
        primary: 'Try again',
      },
      expired_or_incorrect_card: {
        eyebrow: 'CARD DECLINED',
        code: '02',
        headline: "That card won't go through.",
        body: "The number, expiry, or security code didn't check out, or the card's expired. Give it another look. Nothing was charged.",
        primary: 'Try again',
      },
      issuer_declined: {
        eyebrow: 'CARD DECLINED',
        code: '03',
        headline: 'Your bank declined it.',
        body: "They don't tell us why; banks keep that to themselves. A different card usually does the trick. Nothing was charged.",
        primary: 'Try a different card',
      },
      fraud_block: {
        eyebrow: 'CARD FLAGGED',
        code: '04',
        headline: 'Your card got flagged for review.',
        body: 'Your bank put a hold on this one. It happens, often for no real reason. Nothing was charged.',
        primary: 'Try a different card',
        note: "It's worth a quick call to your bank, too.",
      },
      network_timeout: {
        eyebrow: 'CONNECTION HICCUP',
        code: '05',
        headline: "That didn't go through, but it's not your card.",
        body: "Something dropped between us and the payment network. Your card's fine and nothing was charged.",
        primary: 'Try again',
        note: 'If it keeps happening, give it a minute and try again.',
      },
    },
  },
  // 3DS / SCA challenge chrome (design table CHALLENGE_CONFIG). Stripe
  // renders the actual bank window; this is the frame around it.
  challenge: {
    closeLabel: 'Cancel verification and return',
    frameLabel: 'Secure bank verification (handled by Stripe)',
    frameTopLeft: 'Stripe · 3-D Secure',
    frameTopRight: "your bank's window",
    waiting: 'Waiting for your bank…',
    frameBottom: 'Stripe renders this · Concert Crawl never sees it',
    footerNote: "Don't close this window. It'll finish on its own.",
    cancel: 'Cancel payment',
    kinds: {
      '3ds': {
        eyebrow: 'SECURE CHECK · 3DS',
        code: '3DS',
        headline: 'One quick step from your bank.',
        body: "Your bank wants to confirm it's really you. It happens in their secure window below; we never see any of it.",
      },
      sca: {
        eyebrow: 'SECURE CHECK · SCA',
        code: 'SCA',
        headline: 'Your bank needs a thumbs-up.',
        body: "EU rules mean your bank confirms this one directly. Approve it in their secure window below and you're set.",
      },
    },
  },
  // Founder post-claim seat reveal (#781 §3.3, design table Table 2).
  founderClaim: {
    eyebrow: 'Founder · claimed',
    seatCode: (seat: number, total: number) => `${seat}/${total}`,
    seatLabel: 'Your seat',
    seatNumber: (seat: number) => `#${seat}`,
    seatTotal: (total: number) => `of ${total}`,
    headline: 'Founder. Locked in.',
    body: "You got in before the rest. $3 a month for as long as you're here, even when everyone else is paying double.",
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
