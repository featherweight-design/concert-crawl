'use client';

// The root error boundary: it replaces the root layout, so it brings its own
// <html> and <body> and cannot lean on ClerkProvider, ThemeProvider, next/font
// or globals.css. It writes the stored theme's tokens itself (same keys as the
// root layout's pre-paint script) and draws the StandaloneError page.
import { useLayoutEffect, useSyncExternalStore } from 'react';

import { ErrorReport } from '@/components/consumer/error-report';
import { CARD_EDGE_FALLBACK_CSS } from '@/components/consumer/error-report/ErrorTellUsCard';
import { hasClientSession } from '@/components/consumer/error-report/lib/report-context';
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry';
import { THEMES } from '@/theme/themes';

/**
 * Writes the stored theme's tokens onto <html>. It is also serialised into the
 * pre-paint script below (one body for both callers), so it may touch browser
 * globals only, never a module-scope name, and sticks to syntax no build
 * target lowers into a helper call (no for-of, spread or destructuring).
 */
function applyStoredTheme(themes: Record<string, Record<string, string>>) {
  const root = document.documentElement;
  let theme = 'light';
  try {
    const stored = localStorage.getItem('cc-theme');
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'electric'
      : 'light';
    theme =
      stored && Object.prototype.hasOwnProperty.call(themes, stored)
        ? stored
        : system;
  } catch (err) {
    // Storage or matchMedia blocked: keep the light default.
    console.warn('global-error: stored theme unreadable', err);
  }
  const tokens = themes[theme] || {};
  Object.keys(tokens).forEach(function (key) {
    root.style.setProperty('--' + key, tokens[key] || '');
  });
  root.setAttribute('data-theme', theme);
}

// `<` is escaped so no token value can ever close the script tag early.
const themesJson = JSON.stringify(THEMES).replace(/</g, '\\u003c');

// First paint, before hydration. It runs once: React never executes a script
// it renders on the client, and each time it mounts this page's <html> it
// strips every attribute it did not render (the tokens and data-theme), so
// the effect in GlobalError writes them again after every commit.
// The function's source cannot be escaped like the JSON (`<` is only
// valid inside a string), so a `<` in its compiled body fails the build.
const applySource = applyStoredTheme.toString();
if (applySource.includes('<')) {
  throw new Error('global-error: applyStoredTheme must not contain "<"');
}
const themeScript = `(${applySource})(${themesJson});`;

// The cookie is read once per render; nothing on this page changes it.
const subscribeNever = () => () => undefined;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // The app's own rule (every boundary retries through the hook, so the cached
  // failed payload is refreshed too). The router context sits above this file.
  const retry = useErrorBoundaryRetry(reset);
  // No deps on purpose: Try again can re-mount <html>, and every mount wipes
  // the tokens. Layout effect, so the wiped frame never paints.
  useLayoutEffect(() => {
    applyStoredTheme(THEMES);
  });
  // No ClerkProvider here, so the session is read from Clerk's `__client_uat`
  // cookie (addendum-2 §18). The server render has no cookie to read and draws
  // the signed-out layout; the browser corrects it after hydration.
  const signedIn = useSyncExternalStore(
    subscribeNever,
    () => hasClientSession(document.cookie),
    () => false,
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* The Tell us card's edge: globals.css (its `sheet-edge` utility) is
            not loaded on this page. */}
        <style>{CARD_EDGE_FALLBACK_CSS}</style>
      </head>
      <body style={{ margin: 0, background: 'var(--bg)' }}>
        {/* Signed in: the Tell us card, with Go home rather than Sign out
            (addendum-3 B20a), so the body is the one that names no Sign out.
            Signed out: no card. */}
        <ErrorReport error={error} onRetry={retry} signedIn={signedIn} />
      </body>
    </html>
  );
}
