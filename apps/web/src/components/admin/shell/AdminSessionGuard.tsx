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
const ALIVE_FOR_MS = 30_000;

export const AdminSessionGuard = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { openSignIn, addListener } = useClerk();
  const [ended, setEnded] = useState(false);
  const wasSignedIn = useRef(false);
  const probing = useRef(false);
  // When a probe last found the session alive: a page that keeps getting a
  // 401 for a role problem must not mint a fresh token on every response.
  const lastAlive = useRef(0);
  const endedRef = useRef(false);
  endedRef.current = ended;
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  // A 401 can raise the overlay while Clerk still calls the session signed in
  // (a stale one), so signing in again changes nothing `isSignedIn` shows.
  // Clerk tells us when its state changes; if a token comes back, we are back.
  useEffect(
    () =>
      addListener(() => {
        if (!endedRef.current) return;
        getTokenRef
          .current()
          .then((token) => {
            if (token !== null) setEnded(false);
          })
          .catch(() => undefined);
      }),
    [addListener],
  );

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
        if (probing.current || Date.now() - lastAlive.current < ALIVE_FOR_MS) {
          return;
        }
        probing.current = true;
        getTokenRef
          .current({ skipCache: true })
          .then((token) => {
            if (token === null) setEnded(true);
            else lastAlive.current = Date.now();
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
