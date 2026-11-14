'use client';

// The root error boundary: it replaces the root layout, so it brings its own
// <html> and <body> and cannot lean on ClerkProvider, ThemeProvider, next/font
// or globals.css. It writes the stored theme's tokens itself (same keys as the
// root layout's pre-paint script) and draws the StandaloneError page.
import { useSyncExternalStore } from 'react';

import { ErrorReport } from '@/components/consumer/error-report';
import { CARD_EDGE_FALLBACK_CSS } from '@/components/consumer/error-report/ErrorTellUsCard';
import { hasClientSession } from '@/components/consumer/error-report/lib/report-context';
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry';
import { THEMES } from '@/theme/themes';

// `<` is escaped so no token value can ever close the script tag early.
const themesJson = JSON.stringify(THEMES).replace(/</g, '\\u003c');

const themeScript = `
  (function() {
    var themes = ${themesJson};
    var root = document.documentElement;
    var theme = 'light';
    try {
      var stored = localStorage.getItem('cc-theme');
      var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'electric' : 'light';
      theme = (stored && Object.prototype.hasOwnProperty.call(themes, stored)) ? stored : system;
    } catch (e) {}
    var tokens = themes[theme];
    Object.keys(tokens).forEach(function(k) { root.style.setProperty('--' + k, tokens[k]); });
    root.setAttribute('data-theme', theme);
  })();
`;

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
