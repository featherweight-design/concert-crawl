/**
 * Google sign-in, the parts that need no Clerk. The callback sits under
 * `/sign-in` (a public path in the proxy, and no new top-level segment).
 */
export const SSO_CALLBACK_PATH = '/sign-in/sso-callback';

/** Where Google sends the visitor back to, carrying where they were going. */
export function ssoCallbackUrl(returnTo: string): string {
  return `${SSO_CALLBACK_PATH}?${new URLSearchParams({ redirect_url: returnTo }).toString()}`;
}

/** What the sign-in start screen says about a Google attempt that ended there. */
export type GoogleNotice = 'cancelled' | 'refused' | 'failed';

const NOTICES: readonly GoogleNotice[] = ['cancelled', 'refused', 'failed'];

export function parseGoogleNotice(value: unknown): GoogleNotice | null {
  const first = Array.isArray(value) ? value[0] : value;
  return NOTICES.find((notice) => notice === first) ?? null;
}

/** What Clerk left behind when Google sent the visitor back. */
export interface CallbackState {
  signInStatus: string | null;
  /** The sign-in's first factor is a Google account with no account here. */
  transferable: boolean;
  signUpStatus: string | null;
  signUpMissing: readonly string[];
}

export type CallbackOutcome =
  'signedIn' | 'signedUp' | 'consent' | 'refused' | 'cancelled' | 'failed';

/**
 * One decision for the callback. A Google account with no account here is
 * `refused` and is never carried on into a sign-up (that is `<HandleSSOCallback />`'s
 * transfer, which the custom callback does not render). A second factor is
 * `failed`: Client Trust applies to password sign-ins, and a Google account
 * with its own second factor is not supported.
 */
export function decideCallback(state: CallbackState): CallbackOutcome {
  if (state.signInStatus === 'complete') return 'signedIn';
  if (state.signUpStatus === 'complete') return 'signedUp';
  if (
    state.signUpStatus === 'missing_requirements' &&
    state.signUpMissing.includes('legal_accepted')
  ) {
    return 'consent';
  }
  if (state.transferable) return 'refused';
  if (
    state.signInStatus === 'needs_second_factor' ||
    state.signInStatus === 'needs_client_trust' ||
    state.signInStatus === 'needs_new_password' ||
    state.signInStatus === 'needs_protect_check' ||
    state.signUpStatus === 'missing_requirements'
  ) {
    return 'failed';
  }
  return 'cancelled';
}
