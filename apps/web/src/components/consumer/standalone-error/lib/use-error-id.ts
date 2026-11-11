'use client';

import { useEffect, useMemo } from 'react';
import * as Sentry from '@sentry/nextjs';
import { isReportableId } from '../../error-report/lib/report-context';
import { newErrorId } from './report';

// The same error instance can reach a boundary more than once (a remount, a
// development double effect). It keeps one id and files one Sentry event. A
// retry that throws again throws a new error, which is a new id and event.
const ids = new WeakMap<Error, string>();
const captured = new WeakSet<Error>();

export const errorIdFor = (error: Error & { digest?: string }): string => {
  if (isReportableId(error.digest)) return error.digest;
  const seen = ids.get(error);
  if (seen !== undefined) return seen;
  const id = newErrorId();
  ids.set(error, id);
  return id;
};

/**
 * The id the error page shows and a report carries. A server throw is known
 * by its digest and was already reported by instrumentation's
 * onRequestError. A browser throw has none, so it gets a minted id, tagged on
 * the Sentry event filed for it here, once. With Sentry off (local, or no
 * DSN) nothing is filed; the id still identifies the report, it just has no
 * event behind it, and the page never claims one.
 */
export const useErrorId = (error: Error & { digest?: string }): string => {
  const errorId = useMemo(() => errorIdFor(error), [error]);

  useEffect(() => {
    if (isReportableId(error.digest) || captured.has(error)) return;
    if (!Sentry.isEnabled()) return;
    captured.add(error);
    Sentry.captureException(error, { tags: { error_id: errorId } });
  }, [error, errorId]);

  return errorId;
};
