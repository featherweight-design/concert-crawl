export const SIGN_IN_COPY = {
  loading: {
    // Announced while Clerk's form is still mounting. The skeleton itself is
    // aria-hidden, so this is the only thing a screen reader gets.
    aria: 'Loading the sign-in form',
  },
  unavailable: {
    eyebrow: 'Sign in',
    title: "The sign-in form didn't load.",
    sub: "Usually something is blocking it: a VPN, an ad blocker, or your browser's shields. Switch one off and try again.",
    retry: 'Try again',
  },
  // The custom sign-in (design_handoff_custom_auth/COPY.md). DRAFT until
  // copy-review. Strings the pieces share (or, offline, Show and Hide) are in
  // AUTH_FLOW_COPY.
  start: {
    eyebrow: 'Sign in',
    title: 'Sign in',
    body: 'Your Watching, your Concerts and your crews are where you left them.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    continue: 'Continue',
    footBeta: 'New here? Concert Crawl is invite-only for now.',
    footBetaLink: 'Use an invite code',
    emailInvalid: 'Enter an email like you@example.com.',
  },
  password: {
    title: 'Enter your password',
    body: (email: string) => `For ${email}.`,
    change: 'Change',
    label: 'Password',
    submit: 'Sign in',
    forgot: 'Forgot password?',
    // The same line for a wrong password, an unknown email and a locked
    // account, so it never says whether an email has an account.
    didntWork:
      'That email or password isn’t right. Try again, or email yourself a code.',
    busy: 'Signing in…',
  },
  breached: {
    eyebrow: 'Password reset needed',
    title: 'Time for a new password',
    body: 'This password showed up in a data breach on another site, so it can’t be used here anymore. Reset it to sign in. Your shows and settings stay as they are.',
    button: 'Reset password',
  },
  failed: 'Something went wrong on our side. Try again.',
} as const;
