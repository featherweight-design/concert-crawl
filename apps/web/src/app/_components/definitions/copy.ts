// Single source of truth for all public/landing page copy
export const LANDING_COPY = {
  nav: {
    signIn: 'Sign in',
  },
  hero: {
    headingLine1: "See who's",
    headingLine2: 'playing',
    headingAccent: 'tonight.',
    subheading:
      'Every show in Denver, in one place. Built for the fans, not the shareholders.',
  },
  cta: {
    browse: 'Browse shows',
    signUp: 'Sign up',
    noAccountNote: 'No account needed to look around',
  },
  rail: {
    // The count comes from a separate `to`-bounded /v1/events probe, not from
    // the unbounded hero-poster fetch — the words say "this week", so the
    // number has to mean that too. When the probe fails there is no honest
    // number, and the countless variant ships instead of a guess.
    seeAllCounted: (count: number) => `See all ${count} shows this week →`,
    seeAll: 'See all shows this week →',
  },
  waitlist: {
    closeButtonAriaLabel: 'Close',
    success: {
      heading: "You're on the list.",
      body: "We'll email you the moment a beta slot opens up. Thanks for caring about live music.",
      closeButton: 'Close',
    },
    form: {
      eyebrow: 'Waitlist',
      heading: 'Get on the list',
      body: "We're letting people in slowly. Drop your email and we'll ping you when there's room.",
      errorMessage: 'Something went wrong. Try again.',
      emailLabel: 'Email',
      emailPlaceholder: 'you@email.com',
      submittingButton: 'Adding you…',
      submitButton: 'Add me to the list',
      footerNote: "No spam. We'll only email when there's beta access.",
    },
  },
  betaPill: {
    label: 'Private Beta',
  },
} as const
