'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';

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
      fontSize: 16,
      letterSpacing: '-0.02em',
    }}
  >
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        flex: 'none',
        borderRadius: 7,
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 96 96"
        aria-hidden
        focusable="false"
        style={{ display: 'block' }}
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
    </span>
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
    className="cc-se-mark"
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
    <svg width="100%" height="68%" viewBox="0 0 96 96" focusable="false">
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

/**
 * The throw can unmount the control that had focus, which drops focus to
 * <body> and leaves a screen reader silent. The heading takes focus on mount,
 * without scrolling, so the page announces itself.
 */
const Heading = ({
  headingRef,
}: {
  headingRef?: RefObject<HTMLHeadingElement | null> | undefined;
}) => {
  const ownRef = useRef<HTMLHeadingElement>(null);
  const ref = headingRef ?? ownRef;

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [ref]);

  return (
    <h1
      ref={ref}
      tabIndex={-1}
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
  );
};

/** The board's copy mark: two overlapping rounded squares, 12px. */
const CopyIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden
    focusable="false"
    style={{ display: 'block' }}
  >
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <path d="M8 4V2.5A1.5 1.5 0 0 0 6.5 1h-4A1.5 1.5 0 0 0 1 2.5v4A1.5 1.5 0 0 0 2.5 8H4" />
  </svg>
);

const ErrorIdChip = ({
  errorId,
  buttonRef,
}: {
  errorId: string;
  buttonRef?: Ref<HTMLButtonElement> | undefined;
}) => {
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
        ref={buttonRef}
        onClick={onCopy}
        aria-label={`${copy.copyErrorId}: ${errorId}`}
        className="cc-se-copy-btn"
        style={{
          position: 'relative',
          minHeight: 28,
          padding: '0 10px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: 8,
          border: '1px solid var(--border-strong)',
          background: 'var(--surface-1)',
          color: 'var(--fg-muted)',
          fontFamily: 'inherit',
          fontSize: 11.5,
          cursor: 'pointer',
          maxWidth: '100%',
          overflowWrap: 'anywhere',
        }}
      >
        {errorId}
        <span aria-live="polite" style={{ fontSize: 11 }}>
          {copied ? copy.copiedErrorId : <CopyIcon />}
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
 * `!important` only where a rule overrides an inline style (the desktop
 * buttons, the in-app phone margins and Sign out size).
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
/* The drawn chip is 28px; the touch target stays 44 via the pseudo-element. */
.cc-se-copy-btn::before { content: ''; position: absolute; inset: -8px -4px; }
.cc-se-heading { font-size: 30px; }
.cc-se-actions { display: flex; flex-direction: column; align-items: center; width: 100%; gap: 4px; margin-top: 12px; }
.cc-se-try { width: 100%; min-height: 48px; border-radius: 12px; font-size: 16px; }
[data-testid='standalone-error'] { padding: 24px 20px 48px; }
/* In the app shell on a phone (addendum-2 18-error-page/error-in-app-m): the
   app header stands where the logo bar was, the mark sits 26px under it, and
   the board's own sizes and rhythm apply. The 80px foot is not the board's
   24px: the (main) layout reserves no space for the fixed 52px bottom nav
   (each page in the shell carries its own pb-20), so this page clears it
   itself. From 900px, where the nav is hidden, every rule here falls away and
   the page is the standalone one, unchanged. */
@media (max-width: 899px) {
  [data-testid='standalone-error'][data-in-app='true'] { padding: 26px 16px 80px; }
  .cc-se-grid[data-in-app='true'] { padding-top: 0; row-gap: 26px; }
  .cc-se-grid[data-in-app='true'] .cc-se-chip { margin-top: 0; }
  .cc-se-grid[data-in-app='true'] .cc-se-copy { gap: 0; }
  .cc-se-grid[data-in-app='true'] .cc-se-eyebrow { margin-top: 18px !important; font-size: 9.5px !important; letter-spacing: 0.16em !important; }
  .cc-se-grid[data-in-app='true'] .cc-se-heading { font-size: 28px; margin-top: 8px !important; }
  .cc-se-grid[data-in-app='true'] .cc-se-body { margin-top: 10px !important; font-size: 14.5px !important; max-width: 320px; }
  .cc-se-grid[data-in-app='true'] .cc-se-actions { gap: 10px; margin-top: 20px; }
  .cc-se-grid[data-in-app='true'] .cc-se-try { min-height: 48px; font-size: 15px; border-radius: 12px; }
  .cc-se-grid[data-in-app='true'] .cc-se-second { font-size: 14px !important; }
}
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
  .cc-se-try { width: auto; min-height: 48px; padding: 0 28px; border-radius: 12px; font-size: 15px; }
  .cc-se-mark { width: 88px !important; height: 88px !important; border-radius: 26px !important; }
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
  /**
   * Rendered by a route boundary inside the (main) app layout (addendum-2
   * §18, board `error-in-app-m`): the app header and bottom nav stay, so the
   * page drops its own logo bar, its full-viewport height and its background,
   * and sits in the shell. Everything else is the standalone page.
   */
  inApp?: boolean | undefined;
  /**
   * The error ID chip's copy button, so the page can move focus to it when
   * the Tell us card closes under it (Done on a refused report).
   */
  errorIdRef?: Ref<HTMLButtonElement> | undefined;
  /**
   * The page heading (already `tabIndex={-1}`), the focus target when the
   * card closes and there is no error ID chip to land on.
   */
  headingRef?: RefObject<HTMLHeadingElement | null> | undefined;
}

// The standalone page owns the whole viewport and paints its own ground. In
// the shell, the page's ambient ground shows through instead. Padding for both
// lives in LAYOUT_CSS, so the in-app phone frame can stop at 900px.
const STANDALONE_FRAME: CSSProperties = {
  minHeight: '100dvh',
  background:
    // err-m / err-d: a violet glow top-left, a cyan glow bottom-right, and a
    // bg-elevated to bg wash underneath.
    'radial-gradient(120% 60% at 0% 0%, color-mix(in oklch, var(--accent) 14%, transparent), transparent 60%), radial-gradient(100% 50% at 100% 100%, color-mix(in oklch, var(--signal) 9%, transparent), transparent 60%), linear-gradient(180deg, var(--bg-elevated), var(--bg))',
};

export const StandaloneError = ({
  errorId,
  onRetry,
  onSignOut,
  children,
  inApp = false,
  errorIdRef,
  headingRef,
}: StandaloneErrorProps) => (
  <div
    data-testid="standalone-error"
    data-in-app={inApp ? 'true' : undefined}
    style={{
      ...(inApp ? undefined : STANDALONE_FRAME),
      boxSizing: 'border-box',
      color: 'var(--fg)',
      fontFamily: 'var(--font-ui, system-ui, sans-serif)',
    }}
  >
    <style>{LAYOUT_CSS}</style>
    {inApp ? null : (
      <header>
        <Logo />
      </header>
    )}
    <main
      className="cc-se-grid"
      data-split={children ? 'true' : undefined}
      data-in-app={inApp ? 'true' : undefined}
    >
      <div className="cc-se-copy">
        <BrokenMark />
        <p
          className="cc-se-eyebrow"
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
        <Heading headingRef={headingRef} />
        <p
          className="cc-se-body"
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
                'linear-gradient(135deg, var(--signal), var(--cta-end))',
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
          <ErrorIdChip errorId={errorId} buttonRef={errorIdRef} />
        </div>
      ) : null}
    </main>
  </div>
);
