// All customer-facing strings for the #780 manage-subscription sheet and
// the cancel / downgrade / upgrade confirmation flows (PR 4.5). Copy is
// verbatim from the locked design tables:
//   docs/superpowers/design-tables/lifecycle-manage.md
//   docs/superpowers/design-tables/lifecycle-flows.md
// Prices and tier names are data — they live in the tier-picker constants.
// periodEnd is defensive-nullable (active paid plans always carry
// currentPeriodEnd; the fallbacks only trip on inconsistent API state).

export const MANAGE_SHEET_COPY = {
  ariaLabel: 'Manage subscription',
  eyebrow: (tierName: string) => `Manage · ${tierName}`,
  code: (priceText: string) => `${priceText}/MO`,
  title: 'Manage subscription',
  subtitle: (tierName: string, periodEnd: string | null) =>
    periodEnd
      ? `${tierName} · renews ${periodEnd}. Change it, pause it, or just grab a receipt.`
      : `${tierName}. Change it, pause it, or just grab a receipt.`,

  inApp: {
    groupLabel: 'On Concert Crawl',
    changePlan: {
      label: 'Change plan',
      sub: 'Upgrade, downgrade, or switch tiers',
    },
    cancel: {
      label: 'Cancel subscription',
      sub: (tierName: string, periodEnd: string | null) =>
        periodEnd
          ? `Keep ${tierName} until ${periodEnd}, then roll to Free`
          : `Keep ${tierName} until the period ends, then roll to Free`,
    },
  },

  billing: {
    groupLabel: 'Billing & receipts',
    groupNote: 'Opens Stripe in a new tab',
    paymentMethod: { label: 'Payment method', sub: 'Update the card on file' },
    invoices: { label: 'Invoices & receipts', sub: 'Download past charges' },
    billingEmail: { label: 'Billing email', sub: 'Where receipts get sent' },
    tax: { label: 'Tax & region', sub: 'Country, VAT, tax ID' },
  },

  portalChip: 'Stripe',
  footer: 'Stripe handles cards · we never see them',
} as const

export const CANCEL_FLOW_COPY = {
  ariaLabel: 'Cancel subscription',
  eyebrow: (tierName: string) => `Cancel · ${tierName}`,
  headline: 'Stepping back?',
  subhead: "No guilt trip. Here's exactly what happens if you cancel.",

  keepUntilLabel: (tierName: string) => `You keep ${tierName} until`,
  periodEndFallback: 'period end',
  // Premium / Founder: 90-day data-safety note; Supporter is badge-only,
  // so no down-sell nudge and no data note (README decision #6).
  bodyPremiumUp: (periodEnd: string | null) =>
    `You won't be charged again. On ${periodEnd ?? 'the period end'} you roll to Free — and your history, follows, and alerts stay safe for 90 days in case you come back.`,
  bodySupporter: (periodEnd: string | null) =>
    `You won't be charged again. On ${periodEnd ?? 'the period end'} you roll to Free and the Supporter badge comes off. Everything you actually use — saved shows, browsing, prices — was always free and stays put.`,

  retention: {
    eyebrow: 'Before you go',
    headline: (priceText: string) =>
      `If it's the ${priceText} — Supporter's $2.`,
    body: "Supporter keeps you chipping in for less. You'd switch off alerts, follows, and price drops — and your history, follows, and alerts stay safe for 90 days either way.",
    switchCta: 'Switch to Supporter instead',
  },

  confirmCta: 'Cancel subscription',
  keepCta: (tierName: string) => `Never mind — keep ${tierName}`,
  finePrint: (periodEnd: string | null) =>
    `No refunds · access continues to ${periodEnd ?? 'period end'} · cancel anytime`,
} as const

export const DOWNGRADE_FLOW_COPY = {
  ariaLabel: 'Switch to Supporter',
  eyebrow: 'Switch · Premium → Supporter',
  code: '$2/MO',
  headline: 'Switching to Supporter',
  subhead: "Lighter plan, same gratitude. Here's the money and what moves.",

  math: {
    eyebrow: 'The math',
    // Renders around a <strong>$X.XX</strong> credit amount.
    bodyBefore: "Supporter's active the moment you confirm. The ",
    bodyAfter:
      ' from your unused Premium days lands as account credit on your next bill.',
    fromTodayLabel: 'Supporter, from today',
    fromTodayValue: '$2.00/mo',
    creditLabel: 'Credit toward next bill',
  },

  confirmCta: 'Switch to Supporter',
  backCta: 'Never mind',
  finePrint: 'Effective immediately · credit via Stripe · cancel anytime',
} as const

export const UPGRADE_FLOW_COPY = {
  ariaLabel: 'Upgrade to Premium',
  eyebrow: 'Upgrade · Supporter → Premium',
  code: '$5/MO',
  headline: 'Going Premium',
  subhead:
    'The stuff that costs us money to run — switched on the second you confirm.',

  math: {
    eyebrow: 'The math',
    // Renders around a <strong>$X.XX</strong> prorated amount.
    bodyBefore: 'Premium unlocks now. ',
    bodyAfter:
      " covers the rest of this billing cycle; after that it's the usual $5/mo.",
    chargedTodayLabel: 'Charged today (prorated)',
    thenMonthlyLabel: 'Then monthly',
    thenMonthlyValue: '$5.00/mo',
  },

  unlocksLabel: 'Unlocks right away',
  unlocks: [
    'Follow artists',
    'New-show alerts',
    'Price-drop alerts',
    'Spotify sync',
  ],

  confirmCta: 'Unlock Premium',
  confirmSub: (prorated: string) => `${prorated} today, then $5/mo`,
  backCta: 'Not yet',
  finePrint: 'Effective immediately · prorated via Stripe · cancel anytime',
} as const

export const CHANGES_DISCLOSURE_COPY = {
  summary: 'Your history, follows, and alerts stay safe for 90 days.',
  staysLabel: 'Stays on',
  // Supporter is badge-only per the #781 §6 matrix; Watching stays because
  // the R6 amendment moved it to Free for signed-in users.
  stays: [
    'Watching — your saved shows (Free, never purged)',
    'Supporter badge on your profile',
  ],
  offLabel: 'Switches off · safe 90 days',
  off: [
    "Concert history — every show you've logged",
    'Calendar export — Apple + Google',
    'Following artists',
    'New-show alerts',
    'Price-drop alerts',
    'Spotify sync',
  ],
  restoreNote:
    "Re-upgrade within 90 days and it all comes back exactly where you left it. After that it's cleared.",
} as const

// Design defines no loading state for the proration amounts — a quiet
// placeholder holds the slot for the beat the preview takes to land.
export const AMOUNT_PLACEHOLDER = '$—'

// Resubscribe failure copy lives with the plan card (PLAN_CARD_COPY.errors)
// since the Resubscribe CTA renders there, not inside the manage sheet.
export const MANAGE_ERRORS_COPY = {
  cancel: "Couldn't cancel just now. Try again in a moment.",
  changeTier: "Couldn't switch plans just now. Try again in a moment.",
} as const
