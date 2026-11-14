'use client';

import { useEffect, useRef } from 'react';
import { useSignInRedirect } from '@/lib/auth/use-sign-in-redirect';

/**
 * Mounted where a signed-out visitor reached a gated sheet: sends them to
 * sign-in and back, then lets the parent reset its open state so the sheet is
 * closed when they return. Renders nothing.
 */
export const SignInRedirect = ({ onDone }: { onDone: () => void }) => {
  const goToSignIn = useSignInRedirect();
  // Held in refs so the effect runs once per mount, not on every parent render.
  const go = useRef(goToSignIn);
  const done = useRef(onDone);
  const fired = useRef(false);
  go.current = goToSignIn;
  done.current = onDone;
  useEffect(() => {
    // StrictMode runs this twice in dev; one visit, one push.
    if (fired.current) return;
    fired.current = true;
    go.current();
    done.current();
  }, []);
  return null;
};
