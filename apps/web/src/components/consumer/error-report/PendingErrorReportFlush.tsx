'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';

import { flushPendingReport } from './lib/pending-report';

/**
 * Sends a Tell us report that failed on an earlier error page, once, the next
 * time the app opens signed in. Renders nothing.
 */
export const PendingErrorReportFlush = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const tried = useRef(false);

  useEffect(() => {
    if (!isLoaded || isSignedIn !== true || tried.current) return;
    tried.current = true;
    void flushPendingReport(() => getToken(), navigator.userAgent);
  }, [isLoaded, isSignedIn, getToken]);

  return null;
};
