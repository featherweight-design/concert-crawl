// Single source of truth for all public/landing page copy
export const LANDING_COPY = {
  nav: {
    signIn: 'Sign in',
    codeLink: 'I have a code →',
  },
  // What the browser tab, the search result and every social card say when a
  // route does not override them. Here rather than in `layout.tsx` because
  // they are customer-facing strings like any other, and copy-review only
  // covers the definitions files.
  meta: {
    title: 'Concert Crawl',
    // "favorite venues" until this moved into a copy file, where the banned
    // synonym rule reaches it. The word was plain English rather than the
    // Favorites-for-Watching drift the rule guards against, but the rule is
    // right that it should not be in customer copy at all, and the landing
    // subheading already says this better.
    description: 'Denver concert calendar. Every show in one place.',
  },
  // Alt text for the site social card (`/api/og`). Describes the card, not the
  // page: a screen reader meets this inside someone else's feed, with no
  // surrounding context to borrow from.
  og: {
    // Parity with what the card actually draws, wordmark and subheading both.
    // A shorter alt would drop "Built for the fans, not the shareholders",
    // which is the line doing the most work for a sighted reader.
    // `SiteCard.test.tsx` fails if this and the subheading drift apart.
    imageAlt:
      'Concert Crawl. Every show in Denver, in one place. Built for the fans, not the shareholders.',
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
    // Private-beta CTAs. Live again whenever NEXT_PUBLIC_PUBLIC_BROWSE is off.
    code: 'I have a code →',
    waitlist: 'Join the waitlist',
    signIn: 'Already have an account? Sign in →',
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
      footerNote: 'No spam. Only beta access news.',
    },
  },
  betaPill: {
    label: 'Private Beta',
  },
} as const
