'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';

import { flushPendingReport } from './lib/pending-report';

/**
 * Sends a Tell us report that failed on an earlier error page, once, the next
 * time the app opens signed in. Renders nothing.
 */
export const PendingErrorReportFlush = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const tried = useRef(false);

  // Waits for Clerk to say signed in, so the one try per open is not spent on
  // a 401 while Clerk is still loading. A 401 keeps the report for the next
  // open; only a refused report is dropped.
  useEffect(() => {
    if (!isLoaded || isSignedIn !== true || tried.current) return;
    tried.current = true;
    void flushPendingReport(navigator.userAgent);
  }, [isLoaded, isSignedIn]);

  return null;
};
