'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import * as Sentry from '@sentry/nextjs';
import { sentryTier } from '@concert-crawl/types/sentry-tags';

// Puts the signed-in visitor's plan on every browser Sentry event as the
// `tier` tag, read from the Clerk session claim with no request. No user id
// goes with it: the hash key is server-only and cannot ship to the browser.
export function SentryTierTag(): null {
  const { isSignedIn, sessionClaims } = useAuth();

  useEffect(() => {
    Sentry.setTag('tier', isSignedIn ? sentryTier(sessionClaims) : 'unknown');
  }, [isSignedIn, sessionClaims]);

  return null;
}
