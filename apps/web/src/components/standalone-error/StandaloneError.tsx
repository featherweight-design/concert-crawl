'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const copy = CONSUMER_COPY.error;

/**
 * The standalone error page (12-error-page): it has to render even when the
 * app failed, so it imports React and a plain copy object only. No Clerk hooks,
 * ThemeProvider, next/font, images or shared CSS. Every style is inline and
 * reads the theme's CSS variables, which `app/global-error.tsx` writes itself
 * and the app shell has already written for the route boundaries.
 */

/** The same wordmark and mark as the app, drawn inline: a plain link home. */
const Logo = () => (
  // A plain anchor on purpose: a full navigation, so the app is rebuilt rather
  // than routed into by a router that may be the thing that failed.
  // eslint-disable-next-line @next/next/no-html-link-for-pages -- standalone error page, no router
  <a
    href="/"
    aria-label={copy.homeLinkLabel}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      textDecoration: 'none',
      color: 'var(--fg)',
      fontWeight: 800,
      fontSize: 20,
      letterSpacing: '-0.03em',
    }}
  >
    <svg
      width="32"
      height="32"
      viewBox="0 0 96 96"
      aria-hidden
      focusable="false"
    >
      <rect width="96" height="96" rx="16" fill="var(--bg)" />
      <circle cx="72" cy="24" r="20" fill="var(--accent)" opacity="0.22" />
      <circle cx="72" cy="24" r="12" fill="var(--accent)" opacity="0.42" />
      <circle cx="72" cy="24" r="7" fill="var(--signal)" />
      {[
        [14, 76, 1.5],
        [24, 70, 2],
        [34, 64, 2.5],
        [42, 58, 3],
        [50, 50, 4],
        [58, 42, 5],
        [66, 32, 6],
      ].map(([cx, cy, radius], idx) => (
        <circle
          key={cx}
          cx={cx}
          cy={cy}
          r={radius}
          fill="var(--signal)"
          opacity={0.35 + idx * 0.09}
        />
      ))}
    </svg>
    <span>
      {copy.wordmarkLead}
      <span style={{ color: 'var(--accent)' }}>{copy.wordmarkTail}</span>
    </span>
  </a>
);

/** The mark with its trail snapped and the core dark. */
const BrokenMark = () => (
  <div
    aria-hidden
    style={{
      width: 72,
      height: 72,
      borderRadius: 21,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      // Board (addendum-2 18-error-page): danger at 8% fill, 40% border.
      background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
      border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)',
    }}
  >
    <svg width="49" height="49" viewBox="0 0 96 96" focusable="false">
      <circle cx="72" cy="24" r="20" fill="var(--danger)" opacity="0.22" />
      <circle cx="72" cy="24" r="12" fill="var(--danger)" opacity="0.42" />
      <circle cx="72" cy="24" r="7" fill="var(--surface-2)" />
      {/* The drawn coordinates: the trail runs straight to (42,58), then the
          last two dots sag and fall away under the core. */}
      {[
        [14, 76, 1.5, 0.35],
        [24, 70, 2, 0.44],
        [34, 64, 2.5, 0.53],
        [42, 58, 3, 0.62],
        [56, 60, 4, 0.71],
        [66, 70, 3.2, 0.8],
      ].map(([cx, cy, radius, opacity]) => (
        <circle
          key={cx}
          cx={cx}
          cy={cy}
          r={radius}
          fill="var(--signal)"
          opacity={opacity}
        />
      ))}
    </svg>
  </div>
);

const ErrorIdChip = ({ errorId }: { errorId: string }) => {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    // Clipboard is best effort: an insecure context or a denied permission must
    // not turn the error page into a second error.
    try {
      void navigator.clipboard
        .writeText(errorId)
        .then(() => setCopied(true))
        .catch(() => undefined);
    } catch {
      /* no clipboard */
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        fontFamily: 'var(--font-mono, ui-monospace, monospace)',
      }}
    >
      <span
        style={{
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--fg-subtle)',
        }}
      >
        {copy.errorIdLabel}
      </span>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`${copy.copyErrorId}: ${errorId}`}
        style={{
          minHeight: 44,
          padding: '0 14px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          borderRadius: 12,
          border: '1px solid var(--border-strong)',
          background: 'var(--surface-1)',
          color: 'var(--fg-muted)',
          fontFamily: 'inherit',
          fontSize: 15,
          cursor: 'pointer',
          maxWidth: '100%',
          overflowWrap: 'anywhere',
        }}
      >
        {errorId}
        <span aria-live="polite" style={{ fontSize: 11 }}>
          {copied ? copy.copiedErrorId : '⧉'}
        </span>
      </button>
    </div>
  );
};

const SECONDARY_STYLE: CSSProperties = {
  minHeight: 44,
  padding: '0 16px',
  border: 'none',
  background: 'none',
  color: 'var(--fg-muted)',
  fontFamily: 'var(--font-ui, system-ui, sans-serif)',
  fontSize: 17,
  fontWeight: 700,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export interface StandaloneErrorProps {
  /** `error.digest`, or the id minted for a browser throw. Omitted: no chip. */
  errorId?: string | undefined;
  onRetry: () => void;
  /**
   * Signed in with a way to sign out (a route boundary, inside Clerk): the
   * second action reads Sign out. Without it the second action is Go home,
   * which is also all `global-error`, outside every provider, can offer.
   */
  onSignOut?: (() => void) | undefined;
  /** Shown under the chip: the signed-in Tell us card. */
  children?: ReactNode;
}

export const StandaloneError = ({
  errorId,
  onRetry,
  onSignOut,
  children,
}: StandaloneErrorProps) => (
  <div
    data-testid="standalone-error"
    style={{
      minHeight: '100vh',
      boxSizing: 'border-box',
      padding: '24px 20px 48px',
      background:
        'radial-gradient(120% 60% at 0% 0%, color-mix(in oklch, var(--accent) 14%, transparent), transparent 60%), var(--bg)',
      color: 'var(--fg)',
      fontFamily: 'var(--font-ui, system-ui, sans-serif)',
    }}
  >
    <header>
      <Logo />
    </header>
    <main
      style={{
        maxWidth: 400,
        margin: '0 auto',
        paddingTop: 56,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        textAlign: 'center',
      }}
    >
      <BrokenMark />
      <p
        style={{
          margin: '16px 0 0',
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--danger)',
        }}
      >
        {copy.eyebrow}
      </p>
      <h1
        style={{
          margin: 0,
          fontWeight: 900,
          fontSize: 30,
          letterSpacing: '-0.04em',
          lineHeight: 1.1,
        }}
      >
        {copy.errorHeading}
      </h1>
      <p
        style={{
          margin: 0,
          fontSize: 15,
          lineHeight: 1.55,
          color: 'var(--fg-muted)',
        }}
      >
        {onSignOut ? copy.errorBody : copy.signedOutBody}
      </p>
      <button
        type="button"
        onClick={onRetry}
        style={{
          marginTop: 12,
          width: '100%',
          minHeight: 52,
          borderRadius: 16,
          border: 'none',
          background: 'linear-gradient(90deg, var(--signal), var(--accent))',
          boxShadow:
            '0 8px 28px -10px color-mix(in oklch, var(--signal) 55%, transparent)',
          color: 'var(--fg-on-accent)',
          fontFamily: 'inherit',
          fontSize: 17,
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        {copy.tryAgainButton}
      </button>
      {onSignOut ? (
        <button type="button" onClick={onSignOut} style={SECONDARY_STYLE}>
          {copy.signOutButton}
        </button>
      ) : (
        // eslint-disable-next-line @next/next/no-html-link-for-pages -- standalone error page, no router
        <a href="/" style={SECONDARY_STYLE}>
          {copy.goHomeButton}
        </a>
      )}
      {/* The Tell us card comes before the chip, as the boards draw it. */}
      {children}
      {errorId ? (
        <div style={{ marginTop: 24 }}>
          <ErrorIdChip errorId={errorId} />
        </div>
      ) : null}
    </main>
  </div>
);
