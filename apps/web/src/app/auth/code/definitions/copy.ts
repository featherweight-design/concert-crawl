// Shown on the invite code entry screen (step 1 of onboarding, /auth/code)

export const copy = {
  stepLabel: 'Step 1 of 2',
  heading: 'Enter your invite code',
  description: 'Concert Crawl is invite-only right now. Your code looks like',
  codeFormat: 'BETA-XXXX-XXXX',
  input: {
    placeholder: 'BETA-XXXX-XXXX',
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
  errors: {
    invalid_format: 'Code format is BETA-XXXX-XXXX. Check for typos.',
    notfound: 'Code not found. Double-check for typos.',
    used: 'This code has already been redeemed.',
    expired: 'This code has expired.',
    ratelimit: 'Too many attempts. Try again in a few minutes.',
    server_error: 'Something went wrong. Try again.',
  },
  footer: {
    waitlist: "Don't have a code? Join the waitlist",
    back: '← Back to landing',
  },
} as const
