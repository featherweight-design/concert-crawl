'use client';

import { useEffect, useState } from 'react';
import { BRAND_COPY } from '@/components/brand/definitions/copy';
import { coarseDevice, reportPage } from '../error-report/lib/report-context';
import { STANDALONE_ERROR_COPY } from './definitions/copy';
import { CheckIcon, CopyIcon, LogoMark, SnappedMark } from './ErrorMarks';
import { sessionOwner } from './lib/report';
import { STANDALONE_ERROR_CSS } from './lib/styles';
import { TellUsCard } from './TellUsCard';

const copy = STANDALONE_ERROR_COPY;
const COPIED_MS = 2000;

export interface StandaloneErrorProps {
  /** The server digest, or the id minted for a browser throw. */
  errorId: string;
  onRetry: () => void;
  /** Offered to a signed-in visitor when the boundary can reach Clerk. */
  onSignOut?: (() => void) | undefined;
  /** A boundary with its own wording (a crew page) passes it here. */
  eyebrow?: string | undefined;
  heading?: string | undefined;
  body?: string | undefined;
  /**
   * For a boundary inside the app shell (header above, bottom nav below):
   * no full-viewport height, no second logo, and room under the card for the
   * phone nav.
   */
  embedded?: boolean | undefined;
}

interface Context {
  /** Whose session this is, or null when signed out. */
  owner: string | null;
  page: string;
  device: string;
}

/**
 * The page shown when something failed, standalone on purpose: React, a copy
 * object and its own inline styles and SVG, so it renders even when the app
 * shell, the theme provider or Clerk is what broke. Sign-in is read from
 * Clerk's cookie, never its hooks.
 */
export const StandaloneError = ({
  errorId,
  onRetry,
  onSignOut,
  eyebrow = copy.eyebrow,
  heading = copy.heading,
  body,
  embedded = false,
}: StandaloneErrorProps) => {
  // Read after mount: cookies, the path and the agent only exist in the
  // browser, and the server render must match the first client one.
  const [context, setContext] = useState<Context>({
    owner: null,
    page: '',
    device: '',
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setContext({
      owner: sessionOwner(document.cookie),
      page: reportPage(window.location.pathname),
      device: coarseDevice(navigator.userAgent),
    });
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(errorId);
      setCopied(true);
    } catch (err) {
      // No clipboard access; the id is still on screen to read out.
      console.warn('[error page] clipboard write failed', { err });
    }
  };

  const { owner } = context;
  const signedIn = owner !== null;
  const canSignOut = signedIn && onSignOut !== undefined;
  const bodyText = body ?? (canSignOut ? copy.body : copy.signedOutBody);

  return (
    <div className={embedded ? 'cc-err cc-err-embedded' : 'cc-err'}>
      <style dangerouslySetInnerHTML={{ __html: STANDALONE_ERROR_CSS }} />
      {!embedded && (
        <>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full load on purpose: the client router may be what failed, and a fresh document is the recovery */}
          <a href="/" className="cc-err-logo" aria-label={copy.homeLinkLabel}>
            <LogoMark size={30} />
            <span>
              {BRAND_COPY.wordmark.lead}
              <span>{BRAND_COPY.wordmark.accent}</span>
            </span>
          </a>
        </>
      )}
      <div className="cc-err-main">
        <div className="cc-err-lead">
          <div className="cc-err-tile">
            <SnappedMark size={60} />
          </div>
          <p className="cc-err-eyebrow">{eyebrow}</p>
          <h1 className="cc-err-h1">{heading}</h1>
          <p className="cc-err-body">{bodyText}</p>
          <div className="cc-err-actions">
            <button type="button" className="cc-err-primary" onClick={onRetry}>
              {copy.tryAgain}
            </button>
            {canSignOut ? (
              <button
                type="button"
                className="cc-err-secondary"
                onClick={onSignOut}
              >
                {copy.signOut}
              </button>
            ) : (
              // eslint-disable-next-line @next/next/no-html-link-for-pages -- a full load on purpose, as the logo link above
              <a href="/" className="cc-err-secondary">
                {copy.goHome}
              </a>
            )}
          </div>
          <div className="cc-err-id">
            <span className="cc-err-label">{copy.errorIdLabel}</span>
            <button
              type="button"
              className="cc-err-chip"
              aria-label={`${copy.copyErrorId} ${errorId}`}
              onClick={() => void copyId()}
            >
              {errorId}
              {copied ? <CheckIcon size={14} /> : <CopyIcon />}
            </button>
            <span className="cc-err-sr" role="status">
              {copied ? copy.copiedErrorId : ''}
            </span>
          </div>
        </div>
        {owner !== null && (
          <TellUsCard
            owner={owner}
            errorId={errorId}
            page={context.page}
            device={context.device}
            onSignedOut={() => setContext((prev) => ({ ...prev, owner: null }))}
          />
        )}
      </div>
    </div>
  );
};
