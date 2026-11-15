'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { onApiUnauthorized } from '@/lib/api';
import { SignedOutOverlay } from './SignedOutOverlay';

/**
 * Shows the signed-out overlay when the admin's session has really ended, and
 * takes it away when they are signed in again. Two things trigger it:
 *
 * - Clerk reports the session gone (`isSignedIn` goes from true to false).
 * - An admin API call answers 401 AND Clerk cannot hand out a token. A 401 with
 *   a live token is a role or route problem, not a session end, and a sign-in
 *   prompt could not fix it, so that stays the page's own inline error.
 *
 * "Sign in again" opens Clerk's sign-in as a modal over the page. The page
 * never navigates, so what the admin was editing stays where it was; nothing
 * is queued, they press Save again once back.
 */
export const AdminSessionGuard = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { openSignIn } = useClerk();
  const [ended, setEnded] = useState(false);
  const wasSignedIn = useRef(false);
  const probing = useRef(false);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      wasSignedIn.current = true;
      setEnded(false);
    } else if (wasSignedIn.current) {
      setEnded(true);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(
    () =>
      onApiUnauthorized(() => {
        if (probing.current) return;
        probing.current = true;
        getTokenRef
          .current({ skipCache: true })
          .then((token) => {
            if (token === null) setEnded(true);
          })
          // A failed refresh is the network, not the session: the offline
          // banner covers it, and a sign-in prompt would not help.
          .catch(() => undefined)
          .finally(() => {
            probing.current = false;
          });
      }),
    [],
  );

  if (!ended) return null;

  return (
    <SignedOutOverlay
      onSignIn={() => openSignIn({ fallbackRedirectUrl: window.location.href })}
    />
  );
};
