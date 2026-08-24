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
} as const
