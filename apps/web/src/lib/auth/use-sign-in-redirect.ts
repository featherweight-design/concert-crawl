'use client';

import { usePathname, useRouter } from 'next/navigation';
import { buildReturnUrl, encodeIntent, type Intent } from '@/lib/auth/intent';

/** What the visitor pressed, so it can be done for them once they are in. */
export interface PendingAction {
  intent: Intent;
  /** The name the confirmation uses: the show's headliner or the artist. */
  label?: string | null | undefined;
}

/**
 * Sends a signed-out visitor to sign-in and back to where they were, query
 * string and all. The one place a signed-out tap on a gated control goes now
 * that the tier picker is retired (addendum 3: the app is free, so everyone
 * signed in is entitled).
 *
 * A tap on Watch or Follow passes what it was, and the return path carries it
 * (`intent=watch:<id>`, `intent=follow:<slug>`): the sign-in and sign-up pages
 * name it, and the destination does it once for them.
 */
export const useSignInRedirect = () => {
  const router = useRouter();
  const pathname = usePathname();
  return (action?: PendingAction) => {
    const here = `${pathname}${window.location.search}${window.location.hash}`;
    const returnTo = action
      ? buildReturnUrl({
          returnPath: here,
          intent: encodeIntent(action.intent),
          label: action.label ?? null,
        })
      : here;
    router.push(`/sign-in?redirect_url=${encodeURIComponent(returnTo)}`);
  };
};
