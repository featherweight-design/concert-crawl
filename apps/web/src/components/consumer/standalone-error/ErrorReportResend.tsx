'use client';

import { useEffect } from 'react';
import {
  acquireResendLock,
  readPendingReports,
  releaseResendLock,
  removePendingReports,
} from './lib/pending';
import { sendErrorReport, sessionOwner } from './lib/report';

/**
 * Delivers the reports the error page could not send, at the next launch.
 * Signed out, it leaves them for later. Signed in, it drops any saved under
 * another account, sends the rest under a cross-tab lock, and removes only
 * the ones that were delivered or that the server will always refuse; one
 * that failed again stays for a later launch.
 */
export const flushPendingReports = async (): Promise<void> => {
  const owner = sessionOwner(document.cookie);
  if (owner === null) return;

  const entries = readPendingReports();
  const foreign = entries.filter((entry) => entry.owner !== owner);
  removePendingReports(foreign.map((entry) => entry.report.errorId));
  const mine = entries.filter((entry) => entry.owner === owner);
  if (mine.length === 0) return;

  const lock = acquireResendLock();
  if (lock === null) return;
  try {
    const done: string[] = [];
    for (const { report } of mine) {
      const result = await sendErrorReport(report);
      if (result === 'sent' || result === 'rejected') {
        done.push(report.errorId);
      } else if (result === 'unauthorized') {
        break;
      }
    }
    removePendingReports(done);
  } finally {
    releaseResendLock(lock);
  }
};

// Once per tab: a module lives for the page load, so neither development's
// double effect nor a remount sends twice. A reload is a new launch.
let started = false;

/** Mounted once in the root layout, so it runs on every launch. */
export const ErrorReportResend = () => {
  useEffect(() => {
    if (started) return;
    started = true;
    void flushPendingReports();
  }, []);
  return null;
};
