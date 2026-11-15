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
    codeInstead: 'Email me a code instead',
    busy: 'Signing in…',
  },
  breached: {
    eyebrow: 'Password reset needed',
    title: 'Time for a new password',
    body: 'This password showed up in a data breach on another site, so it can’t be used here anymore. Reset it to sign in. Your shows and settings stay as they are.',
    button: 'Reset password',
  },
  emailCode: {
    title: 'Check your email',
    // Worded to read the same whether or not the email has an account.
    body: (email: string) =>
      `If ${email} has an account, we sent it a 6-digit code. It works for 10 minutes.`,
    submit: 'Sign in',
    resendIn: (clock: string) => `Send a new code in ${clock}`,
    resend: 'Send a new code',
    usePassword: 'Use my password instead',
    wrong: 'That code isn’t right. Check the latest email and try again.',
    expired: 'That code has run out. Send a new one.',
    sent: 'New code sent. Use the newest email.',
  },
  device: {
    eyebrow: 'New device',
    title: 'Confirm it’s you',
    body: (email: string) =>
      `You’re signing in somewhere we haven’t seen before, so we sent a 6-digit code to ${email}.`,
    submit: 'Confirm and sign in',
  },
  rateLimited: {
    message: 'Too many tries. Wait a minute, then try again.',
    countdown: (clock: string) => `Try again in ${clock}`,
  },
  // The reset flow (COPY.md "Forgot password"). DRAFT until copy-review.
  forgot: {
    title: 'Reset your password',
    body: 'Enter your email and we’ll send a 6-digit code.',
    send: 'Send code',
    back: 'Back to sign in',
    codeTitle: 'Choose a new password',
    // Worded to read the same whether or not the address has an account.
    codeBody: (email: string) =>
      `If ${email} has an account, we sent it a 6-digit code. Enter it, then choose a new password.`,
    newLabel: 'New password',
    rule: 'At least 8 characters.',
    save: 'Save and sign in',
    busy: 'Saving…',
    sending: 'Sending…',
    resend: 'Send a new code',
    sent: 'New code sent. Use the newest email.',
    doneTitle: 'Password changed',
    doneBody: 'You’re signed in. Taking you back now.',
    doneLink: 'Continue',
    codeWrong: 'That code isn’t right. Check the latest email and try again.',
    codeExpired: 'That code has run out. Send a new one.',
    tooShort: 'Use at least 8 characters.',
    weak: 'That password is too easy to guess. Try a longer one, or a few words together.',
    breached:
      'That password has appeared in a data breach, so it can’t be used. Choose a different one.',
  },
  // Not "on our side": a blocker or a bad connection reads the same.
  failed: 'Something went wrong. Try again.',
} as const;
