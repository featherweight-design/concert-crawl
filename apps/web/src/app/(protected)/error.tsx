'use client';

import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry';
import { ErrorReportForm } from '@/components/consumer/error-report';

const copy = CONSUMER_COPY.error;

// A boundary can re-render with the same error (a retry that throws again
// lands here once more), and each render must not file another Sentry event.
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
  captured.set(error, eventId);
  return eventId;
};

interface ProtectedErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProtectedError({ error, reset }: ProtectedErrorProps) {
  const { signOut } = useClerk();
  const router = useRouter();
  const retry = useErrorBoundaryRetry(reset);
  const { isSignedIn } = useAuth();
  const [reporting, setReporting] = useState(false);
  const [sentryEventId, setSentryEventId] = useState<string | undefined>();

  useEffect(() => {
    console.error('[app error]', error);
    setSentryEventId(eventIdFor(error));
  }, [error]);

  function handleSignOut() {
    void signOut(() => router.push('/'));
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: '24px 16px',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--font-ui)',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1
          style={{
            fontWeight: 900,
            fontSize: 20,
            letterSpacing: '-0.02em',
            color: 'var(--fg)',
            margin: 0,
          }}
        >
          {copy.errorHeading}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: 'var(--fg-muted)',
            margin: 0,
            maxWidth: 320,
          }}
        >
          {copy.errorBody}
        </p>
        {error.digest && (
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--fg-subtle)',
              margin: 0,
            }}
          >
            {error.digest}
          </p>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <button
          type="button"
          onClick={retry}
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-1)',
            color: 'var(--fg)',
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {copy.tryAgainButton}
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            border: '1px solid transparent',
            background: 'var(--fg)',
            color: 'var(--bg)',
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {copy.signOutButton}
        </button>
      </div>
      {isSignedIn === true && (
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
          {copy.reportLink}
        </button>
      )}
      <ErrorReportForm
        open={reporting}
        onClose={() => setReporting(false)}
        digest={error.digest}
        sentryEventId={sentryEventId}
      />
    </div>
  );
}
