'use client';

import { usePathname, useRouter } from 'next/navigation';

/**
 * Sends a signed-out visitor to sign-in and back to where they were, query
 * string and all. The one place a signed-out tap on a gated control goes now
 * that the tier picker is retired (addendum 3: the app is free, so everyone
 * signed in is entitled).
 */
export const useSignInRedirect = () => {
  const router = useRouter();
  const pathname = usePathname();
  return () => {
    const here = `${pathname}${window.location.search}`;
    router.push(`/sign-in?redirect_url=${encodeURIComponent(here)}`);
  };
};
