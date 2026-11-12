'use client';

// The root error boundary: it replaces the root layout, so it brings its own
// <html> and <body> and cannot lean on ClerkProvider, ThemeProvider, next/font
// or globals.css. It writes the stored theme's tokens itself (same keys as the
// root layout's pre-paint script) and draws the StandaloneError page.
import { StandaloneError } from '@/components/standalone-error/StandaloneError';
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

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body style={{ margin: 0, background: 'var(--bg)' }}>
        <StandaloneError errorId={error.digest} onRetry={reset} />
      </body>
    </html>
  );
}
