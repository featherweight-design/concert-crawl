// Shown on the invite code entry screen (step 1 of onboarding, /auth/code)

export const copy = {
  stepLabel: 'Step 1 of 2',
  heading: 'Enter your invite code',
  description: 'Concert Crawl is invite-only right now. Your code looks like',
  // Both shapes a code can take: generated, or a custom word from a poster.
  codeFormat: 'BETA-XXXX-XXXX or REDROCKS',
  input: {
    placeholder: 'Your code',
    ariaLabel: 'Invite code',
  },
  hint: {
    empty: 'Format: BETA-XXXX-XXXX',
    valid: 'Looks good ✓',
    remaining: (count: number) => `${count} characters remaining`,
  },
  button: {
    idle: 'Continue →',
    pending: 'Checking…',
  },
  // Under the Continue button: "continuing" is that button. Same shape as the
  // checkout panel's legal line, and the link names the document's own heading.
  agreement: {
    prefix: 'By continuing you agree to our ',
    link: 'Private Beta Agreement',
    href: '/legal/beta',
  },
  errors: {
    invalid_format:
      'Codes are BETA-XXXX-XXXX, or 4 to 20 letters and numbers. Check for typos.',
    notfound: 'Code not found. Double-check for typos.',
    used: 'This code has already been redeemed.',
    expired: 'This code has expired.',
    ratelimit: 'Too many attempts. Try again in a few minutes.',
    server_error: 'Something went wrong. Try again.',
  },
  // A code an admin ended on purpose (`code-ended-fan-m`). The board's last
  // sentence says Concert Crawl is "still open to everyone", which this app is
  // not while the beta is invite-only (this page asks for a code and offers a
  // waitlist), so the line says what is true: the landing page is still open.
  ended: {
    heading: 'This code has ended',
    body: "It was for a limited group, and it isn't taking new people now. You can still look around.",
    browse: "See what's on in Denver",
    browseHref: '/',
    signIn: 'Sign in',
    signInHref: '/sign-in',
  },
  footer: {
    waitlist: "Don't have a code? Join the waitlist",
    back: '← Back to landing',
  },
} as const;
