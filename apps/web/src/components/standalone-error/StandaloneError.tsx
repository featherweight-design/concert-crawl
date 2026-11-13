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

/**
 * The layout, in one <style> so the page needs no shared CSS. A phone is one
 * centred column (copy, then the Tell us card, then the Error ID chip). From
 * 900px the signed-in page splits as the desktop boards draw it: the copy and
 * the chip on the left, a 440px card on the right, vertically centred; the
 * signed-out page stays one centred column with the buttons in a row.
 * `!important` on the desktop button rules only: the phone styles are inline.
 */
const LAYOUT_CSS = `
/* Addendum-4 section 3, the same definition as globals.css: this page cannot
   rely on it, because global-error replaces the root layout and never loads it.
   Derived from the theme's own --accent, which the page's theme script sets. */
[data-testid='standalone-error'] {
  --cta-end: color-mix(in srgb, var(--accent) 75%, var(--signal));
}
.cc-se-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: 'copy' 'chip';
  max-width: 400px;
  margin: 0 auto;
  padding-top: 56px;
  row-gap: 12px;
  justify-items: center;
  text-align: center;
}
.cc-se-copy {
  grid-area: copy;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.cc-se-grid[data-split='true'] { grid-template-areas: 'copy' 'aside' 'chip'; }
.cc-se-aside { grid-area: aside; width: 100%; }
.cc-se-chip { grid-area: chip; margin-top: 12px; }
.cc-se-heading { font-size: 30px; }
.cc-se-actions { display: flex; flex-direction: column; align-items: center; width: 100%; gap: 4px; margin-top: 12px; }
.cc-se-try { width: 100%; min-height: 52px; border-radius: 16px; font-size: 17px; }
@media (min-width: 900px) {
  .cc-se-grid { max-width: 1100px; padding-top: 96px; row-gap: 0; }
  .cc-se-grid[data-split='true'] {
    grid-template-columns: minmax(0, 1fr) 440px;
    grid-template-areas: 'copy aside' 'chip aside';
    column-gap: 60px;
    max-width: 1000px;
    justify-items: start;
    align-items: center;
    text-align: left;
  }
  .cc-se-grid[data-split='true'] .cc-se-copy { align-items: flex-start; align-self: end; }
  .cc-se-grid[data-split='true'] .cc-se-chip { align-self: start; margin-top: 28px; }
  .cc-se-grid[data-split='true'] .cc-se-actions { justify-content: flex-start; }
  .cc-se-heading { font-size: 44px; }
  .cc-se-chip { margin-top: 28px; }
  .cc-se-copy p { max-width: 410px; }
  .cc-se-actions { flex-direction: row; justify-content: center; gap: 10px; width: auto; margin-top: 16px; }
  .cc-se-try { width: auto; min-height: 48px; padding: 0 28px; border-radius: 14px; font-size: 15px; }
  .cc-se-second {
    min-height: 48px; padding: 0 24px !important; border-radius: 14px;
    border: 1px solid var(--border-strong) !important;
    background: var(--surface-1) !important; color: var(--fg) !important;
    font-size: 15px !important;
  }
}
`;

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
      minHeight: '100dvh',
      boxSizing: 'border-box',
      padding: '24px 20px 48px',
      background:
        'radial-gradient(120% 60% at 0% 0%, color-mix(in oklch, var(--accent) 14%, transparent), transparent 60%), var(--bg)',
      color: 'var(--fg)',
      fontFamily: 'var(--font-ui, system-ui, sans-serif)',
    }}
  >
    <style>{LAYOUT_CSS}</style>
    <header>
      <Logo />
    </header>
    <main className="cc-se-grid" data-split={children ? 'true' : undefined}>
      <div className="cc-se-copy">
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
          className="cc-se-heading"
          style={{
            margin: 0,
            fontWeight: 900,
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
        <div className="cc-se-actions">
          <button
            type="button"
            onClick={onRetry}
            className="cc-se-try"
            style={{
              border: 'none',
              background:
                'linear-gradient(90deg, var(--signal), var(--cta-end))',
              boxShadow:
                '0 8px 28px -10px color-mix(in oklch, var(--signal) 55%, transparent)',
              color: 'var(--fg-on-accent)',
              fontFamily: 'inherit',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {copy.tryAgainButton}
          </button>
          {onSignOut ? (
            <button
              type="button"
              onClick={onSignOut}
              className="cc-se-second"
              style={SECONDARY_STYLE}
            >
              {copy.signOutButton}
            </button>
          ) : (
            // eslint-disable-next-line @next/next/no-html-link-for-pages -- standalone error page, no router
            <a href="/" className="cc-se-second" style={SECONDARY_STYLE}>
              {copy.goHomeButton}
            </a>
          )}
        </div>
      </div>
      {/* The Tell us card comes before the chip on a phone, beside the copy on
          a wide screen, as the boards draw it. */}
      {children ? <div className="cc-se-aside">{children}</div> : null}
      {errorId ? (
        <div className="cc-se-chip">
          <ErrorIdChip errorId={errorId} />
        </div>
      ) : null}
    </main>
  </div>
);
