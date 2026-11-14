'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as Sentry from '@sentry/nextjs';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { StandaloneError } from '@/components/standalone-error/StandaloneError';
import { ErrorTellUsCard } from './ErrorTellUsCard';
import { mintClientErrorId } from './lib/report-context';

interface ClientErrorIds {
  /** Shown in the chip and sent as the report's `digest`. */
  clientId: string;
  /** The Sentry event, when Sentry is on. */
  sentryEventId: string | undefined;
}

// The same error instance can reach a boundary more than once (a remount, a
// development double effect), and must file one Sentry event under one id. A
// retry that throws again throws a new error, which gets a new id and a new
// event, as it should.
const minted = new WeakMap<Error, ClientErrorIds>();

/**
 * The ids the team can find a browser throw by. A server throw arrives with a
 * `digest` and was already reported by instrumentation's onRequestError, so
 * only a browser throw is captured here, once, tagged with the minted id so a
 * report can be matched to its event.
 */
const clientIdsFor = (
  error: Error & { digest?: string },
): ClientErrorIds | undefined => {
  if (error.digest) return undefined;
  const seen = minted.get(error);
  if (seen !== undefined) return seen;
  const clientId = mintClientErrorId();
  const eventId = Sentry.captureException(error, {
    tags: { error_id: clientId },
  });
  const ids = {
    clientId,
    // With Sentry off (local, or no DSN) the event id is minted but nothing is
    // sent, so a report must not point the team at an event that does not
    // exist. The client id still shows: it is ours, not Sentry's.
    sentryEventId: Sentry.isEnabled() ? eventId : undefined,
  };
  minted.set(error, ids);
  return ids;
};

interface ErrorReportProps {
  error: Error & { digest?: string };
  /** The boundary's `useErrorBoundaryRetry(reset)`. */
  onRetry: () => void;
  /**
   * Whether the visitor is signed in, as the boundary can tell: Clerk's
   * `useAuth` in a route boundary, the `__client_uat` cookie in
   * `global-error`, which has no ClerkProvider. Signed in gets the Tell us card.
   */
  signedIn: boolean;
  /**
   * Signed in with a way to sign out (a route boundary): the second action is
   * Sign out. Without it (`global-error`) it is Go home.
   */
  onSignOut?: (() => void) | undefined;
  /** Inside the (main) app layout: see `StandaloneError`. */
  inApp?: boolean | undefined;
}

/**
 * The error page every error boundary draws (12-error-page, addendum-2 §18):
 * the standalone page, with the Tell us card for a signed-in visitor. It owns
 * the page-level states the card can cause: a 401 on send switches the page to
 * the signed-out layout (no card, Go home), and Done on a refused report
 * closes the card, keeps the error ID and puts focus on it. No Clerk hook
 * here, so `global-error` can use it.
 */
export const ErrorReport = (props: ErrorReportProps) => (
  // A new error (a retry that threw again) is a new page: the card comes back,
  // a lost-session switch and a closed card are forgotten, and a browser throw
  // gets its own id. Keyed on the error's identity so all of that resets.
  <ErrorReportPage key={pageKeyFor(props.error)} {...props} />
);

const pageKeys = new WeakMap<Error, number>();
let nextPageKey = 0;
const pageKeyFor = (error: Error): number => {
  const seen = pageKeys.get(error);
  if (seen !== undefined) return seen;
  nextPageKey += 1;
  pageKeys.set(error, nextPageKey);
  return nextPageKey;
};

// Read by screen readers, never seen.
const VISUALLY_HIDDEN: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const ErrorReportPage = ({
  error,
  onRetry,
  signedIn,
  onSignOut,
  inApp,
}: ErrorReportProps) => {
  const [clientIds, setClientIds] = useState<ClientErrorIds | undefined>();
  const [sessionLost, setSessionLost] = useState(false);
  const [cardClosed, setCardClosed] = useState(false);
  const errorIdRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Minted after mount, not during render: a server-rendered boundary always
  // has a digest, and a random id in render would not survive hydration.
  useEffect(() => {
    setClientIds(clientIdsFor(error));
  }, [error]);

  // Done (or a 401 switching the page to signed out) unmounts the card, so
  // focus goes to the error ID it pointed at, or, with no chip, to the page
  // heading: never to <body>.
  useEffect(() => {
    if (!cardClosed && !sessionLost) return;
    (errorIdRef.current ?? headingRef.current)?.focus();
  }, [cardClosed, sessionLost]);

  // `digest` has two meanings on this page and in the report: the server's
  // digest for a server throw, or, only when there is none, the id minted
  // here for a browser throw. A server digest is never replaced.
  const errorId = error.digest ? error.digest : clientIds?.clientId;
  const signedInNow = signedIn && !sessionLost;

  return (
    <>
      <StandaloneError
        errorId={errorId}
        errorIdRef={errorIdRef}
        headingRef={headingRef}
        onRetry={onRetry}
        onSignOut={signedInNow ? onSignOut : undefined}
        inApp={inApp}
      >
        {signedInNow && !cardClosed ? (
          <ErrorTellUsCard
            digest={errorId}
            sentryEventId={clientIds?.sentryEventId}
            onSignedOut={() => setSessionLost(true)}
            onDone={() => setCardClosed(true)}
          />
        ) : null}
      </StandaloneError>
      {/* Outside the card, which a 401 unmounts: the switch to the signed-out
          layout says the report was kept, as the failed state would have. */}
      <p role="status" aria-live="polite" style={VISUALLY_HIDDEN}>
        {sessionLost ? CONSUMER_COPY.errorReport.card.savedHeading : ''}
      </p>
    </>
  );
};
