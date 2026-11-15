// Shown on the invite code entry screen (step 1 of sign-up, /auth/code).
// design_handoff_custom_auth/COPY.md "Invite code". DRAFT until copy-review.
// The step label ("Step 1 of 3") is the step trail's own.

export const copy = {
  heading: 'Enter your invite code',
  description:
    'Concert Crawl is invite-only right now. Your code is on the invite you got, the poster you scanned or the text a friend sent.',
  // A code that arrived in the link (a poster's QR) and was filled in for them.
  prefilled: {
    eyebrow: 'Your invite',
    heading: 'You’re invited',
    body: 'Your code is filled in from the link. Check it, then continue.',
  },
  input: {
    placeholder: 'Your code',
    ariaLabel: 'Invite code',
  },
  hint: {
    // While a code is still being typed or pasted.
    paste: 'Paste works too. We add the dashes.',
    valid: 'Looks good',
  },
  button: {
    idle: 'Continue',
    pending: 'Checking…',
    // Too many tries: the field locks and the button counts down.
    wait: (clock: string) => `Try again in ${clock}`,
  },
  // Under the Continue button: "continuing" is that button. Same shape as the
  // checkout panel's legal line, and the link names the document's own heading.
  // Stays until the cutover: the sign-up form that carries its own consent
  // checkbox is not live yet, so this line is still the Beta Agreement's
  // consent. It goes in the cutover PR.
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
  // What to do next, after a used or an expired code. The link is part of the
  // sentence, so each is a lead, the link and an end.
  usedNext: {
    lead: ' If it was yours, ',
    link: 'sign in instead',
    end: '.',
    href: '/sign-in',
  },
  expiredNext: {
    lead: ' Ask whoever sent it for a new one, or ',
    link: 'join the waitlist',
    end: '.',
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
    // The way back to the code form (addendum 6 item 42): a quieter third
    // exit, so an ended code is not a dead end for someone holding another.
    another: { prefix: 'Have another code?', link: 'Enter it' },
  },
  footer: {
    waitlist: "Don't have a code? Join the waitlist",
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
    signInHref: '/sign-in',
  },
} as const;
