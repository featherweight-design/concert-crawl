'use client';

import { useEffect, useRef } from 'react';
import {
  clearPendingReport,
  hasClerkSession,
  readPendingReport,
  sendErrorReport,
} from './lib/report';
import { parseErrorReport } from './lib/parse';

/**
 * Delivers a report the error page could not send, the next time the app
 * opens. It waits for a session (the route needs one), drops a saved copy
 * that is unreadable or that the server rejects, and keeps one that failed
 * for a launch after this.
 */
export const flushPendingReport = async (): Promise<void> => {
  const saved = readPendingReport();
  if (saved === null) return;
  const report = parseErrorReport(saved);
  if (report === null) {
    clearPendingReport();
    return;
  }
  if (!hasClerkSession(document.cookie)) return;
  const result = await sendErrorReport(report);
  if (result === 'sent' || result === 'rejected') clearPendingReport();
};

/** Mounted once in the root layout, so it runs on every launch. */
export const ErrorReportResend = () => {
  // Development's double effect must not send the same report twice.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void flushPendingReport();
  }, []);
  return null;
};
