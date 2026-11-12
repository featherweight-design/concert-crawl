'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import * as Sentry from '@sentry/nextjs';
import { sentryTier } from '@concert-crawl/types/sentry-tags';

// Puts the signed-in visitor's plan on browser Sentry events as the `tier`
// tag while this component is mounted (the protected layout), read from the
// Clerk session claim with no request. The tag goes back to `unknown` when the
// component unmounts or the session changes, so a plan never outlives the
// session it came from. No user id goes with it: the hash key is server-only
// and cannot ship to the browser.
export function SentryTierTag(): null {
  const { isLoaded, isSignedIn, sessionClaims } = useAuth();

  // The plan string, not the claims object: a token refresh hands back a new
  // object every time, which would reset and re-set the tag for nothing.
  const tier = isLoaded
    ? isSignedIn
      ? sentryTier(sessionClaims)
      : 'unknown'
    : undefined;

  useEffect(() => {
    if (tier === undefined) return;
    Sentry.setTag('tier', tier);
    return () => Sentry.setTag('tier', 'unknown');
  }, [tier]);

  return null;
}
