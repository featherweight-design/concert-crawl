/**
 * The custom sign-up (design_handoff_custom_auth/COPY.md "Sign up"). DRAFT
 * until copy-review. Strings the pieces share (the consent sentence parts, the
 * legal sheet's close, Applied, offline, the step labels) are in
 * AUTH_FLOW_COPY; the generic failure line is SIGN_IN_COPY.failed.
 */
export const SIGN_UP_COPY = {
  form: {
    title: 'Make your account',
    body: 'Your invite is in. Add your email and a password.',
    bodyLaunch:
      'Every show in Denver, in one place. Add your email and a password.',
    inviteChip: 'Invite',
    inviteChange: 'Use a different code',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    emailInvalid: 'Enter an email like you@example.com.',
    passwordLabel: 'Password',
    submit: 'Make my account',
    busy: 'Making your account…',
    done: 'You’re in',
    foot: 'Already have an account?',
    footLink: 'Sign in',
  },
  errors: {
    tooShort: 'Use at least 8 characters.',
    weak: 'That password is too easy to guess. Try a longer one, or a few words together.',
    breached:
      'That password has appeared in a data breach, so it can’t be used. Choose a different one.',
  },
  // Shown while Clerk's own check holds the press, or after it failed.
  bot: {
    title: 'One quick check',
    body: 'This makes sure you’re a person and not a bot. It only shows up now and then.',
  },
  legal: {
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    beta: 'Private Beta Agreement',
  },
  verify: {
    title: 'Check your email',
    body: (email: string) =>
      `We sent a 6-digit code to ${email}. Enter it to finish making your account.`,
    submit: 'Finish',
    busy: 'Checking…',
    wrongEmail: 'Wrong email? Go back',
    // Shown on every verify screen, so it says nothing about this address.
    haveAccount: 'Already have an account with this email?',
    haveAccountLink: 'Sign in instead.',
    resendIn: (clock: string) => `Send a new code in ${clock}`,
    resend: 'Send a new code',
    sent: 'New code sent. Use the newest email.',
    wrong: 'That code isn’t right. Check the latest email and try again.',
    expired: 'That code has run out. Send a new one.',
  },
} as const;
