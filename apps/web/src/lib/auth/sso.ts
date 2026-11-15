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
  /**
   * Clerk's `signIn.isTransferable`: the Google account has no account here and
   * the sign-in could be carried on into a sign-up.
   */
  transferable: boolean;
  signUpStatus: string | null;
  signUpMissing: readonly string[];
  /**
   * Clerk's `signUp.isTransferable`: Google was started from the sign-up page
   * and the account already exists, so the sign-up can become a sign-in.
   */
  signUpTransferable: boolean;
}

export type CallbackOutcome =
  | 'signedIn'
  | 'signedUp'
  | 'signInTransfer'
  | 'consent'
  | 'refused'
  | 'cancelled'
  | 'failed';

/**
 * One decision for the callback. A Google account with no account here is
 * `refused` and is never carried on into a sign-up (that is `<HandleSSOCallback />`'s
 * transfer, which the custom callback does not render), and it is read before
 * anything about a sign-up so a stale sign-up cannot override it. The other
 * direction is safe: a sign-up for an account that already exists becomes the
 * sign-in it should have been (`signInTransfer`). A second factor is `failed`:
 * Client Trust applies to password sign-ins, and a Google account with its own
 * second factor is not supported.
 */
export function decideCallback(state: CallbackState): CallbackOutcome {
  if (state.signInStatus === 'complete') return 'signedIn';
  if (state.signUpStatus === 'complete') return 'signedUp';
  if (state.transferable) return 'refused';
  if (state.signUpTransferable) return 'signInTransfer';
  if (
    state.signUpStatus === 'missing_requirements' &&
    state.signUpMissing.includes('legal_accepted')
  ) {
    return 'consent';
  }
  if (
    state.signInStatus === 'needs_second_factor' ||
    state.signInStatus === 'needs_client_trust' ||
    state.signInStatus === 'needs_protect_check' ||
    state.signUpStatus === 'missing_requirements'
  ) {
    return 'failed';
  }
  return 'cancelled';
}
