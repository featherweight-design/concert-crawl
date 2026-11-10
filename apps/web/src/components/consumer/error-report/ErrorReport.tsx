'use client';

import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useAuth } from '@clerk/nextjs';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { ErrorReportForm } from './ErrorReportForm';

// The same error instance can reach a boundary more than once (a remount, a
// development double effect), and must file one Sentry event. A retry that
// throws again throws a new error, which is a new event, as it should be.
const captured = new WeakMap<Error, string>();

/**
 * The id the team can find this failure by. A server throw arrives with a
 * `digest` and was already reported by instrumentation's onRequestError, so
 * only a browser throw is captured here, once.
 */
const eventIdFor = (error: Error & { digest?: string }): string | undefined => {
  if (error.digest) return undefined;
  const seen = captured.get(error);
  if (seen !== undefined) return seen;
  const eventId = Sentry.captureException(error);
  // With Sentry off (local, or no DSN) the id is minted but nothing is sent,
  // so a report must not point the team at an event that does not exist.
  if (!Sentry.isEnabled()) return undefined;
  captured.set(error, eventId);
  return eventId;
};

/**
 * What every error boundary adds under its own buttons: the browser throw
 * reported to Sentry, and, for a signed-in visitor, a quiet way to tell us
 * what happened. Self-contained so each boundary keeps its own look.
 */
export function ErrorReport({ error }: { error: Error & { digest?: string } }) {
  const { isSignedIn } = useAuth();
  const [reporting, setReporting] = useState(false);
  const [sentryEventId, setSentryEventId] = useState<string | undefined>();

  useEffect(() => {
    setSentryEventId(eventIdFor(error));
  }, [error]);

  if (isSignedIn !== true) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setReporting(true)}
        style={{
          minHeight: 44,
          padding: '0 8px',
          border: 'none',
          background: 'none',
          color: 'var(--fg-muted)',
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          textDecoration: 'underline',
          cursor: 'pointer',
        }}
      >
        {CONSUMER_COPY.error.reportLink}
      </button>
      <ErrorReportForm
        open={reporting}
        onClose={() => setReporting(false)}
        digest={error.digest}
        sentryEventId={sentryEventId}
      />
    </>
  );
}
