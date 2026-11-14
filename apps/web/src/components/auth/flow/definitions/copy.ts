/**
 * The strings the custom sign-in and sign-up pieces share, from
 * `design/design_handoff_custom_auth/COPY.md`. Per-screen strings join the
 * route that draws them. All DRAFT until `copy-review`.
 */
export const AUTH_FLOW_COPY = {
  back: 'Back',
  logoLabel: 'Concert Crawl',
  foot: {
    terms: 'Terms',
    privacy: 'Privacy',
    // The count comes from the landing's venue source, so the "21" is a
    // number the page passes in (README gap 12), never typed here.
    proof: (count: number) => `${count} venues · crawled every morning`,
  },
  google: {
    label: 'Continue with Google',
    busy: 'Opening Google…',
  },
  or: 'or',
  password: {
    show: 'Show',
    hide: 'Hide',
    // The button's accessible name: the visible word, in context.
    showLabel: 'Show password',
    hideLabel: 'Hide password',
    rule: 'At least 8 characters.',
  },
  code: {
    label: '6-digit code',
  },
  consent: {
    // "I agree to the {terms}, the {privacy} and the {beta}." The pieces are
    // here so each route can join the links it shows.
    lead: 'I agree to the ',
    and: ' and the ',
    comma: ', the ',
    end: '.',
    terms: 'Terms',
    privacy: 'Privacy Policy',
    beta: 'Private Beta Agreement',
    error: 'Tick the box to agree before we make your account.',
  },
  legal: {
    eyebrow: 'Terms',
    done: 'Back to the form',
  },
  offline:
    'You’re offline. What you typed is still here. Try again when you’re back online.',
  applied: 'Applied',
  // Labels for the development-only parts page; never shown to a visitor.
  parts: {
    continue: 'Continue',
    youreIn: 'You’re in',
    useCode: 'Use an invite code',
    forgot: 'Forgot password?',
    legalBody: 'The live page renders here.',
    termsTitle: 'Terms of Service',
    privacyTitle: 'Privacy Policy',
  },
  steps: {
    label: (step: number, total: number) => `Step ${step} of ${total}`,
    done: 'Account made',
  },
} as const;
