// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { THEMES, THEME_NAMES } from '@/theme/themes';
import { THEME_PREPAINT_SCRIPT, THEME_TOKEN_CSS } from './styles';

// The error page can't use the ThemeProvider, so it carries the tokens itself.
// They are built from themes.ts; this pins that every theme and every token
// arrives, so a new theme or token can't leave the page a step behind.
describe('error page theme tokens', () => {
  it.each(THEME_NAMES)(
    'carries every %s token, keyed by data-theme',
    (name) => {
      const rule = THEME_TOKEN_CSS.split('\n').find((line) =>
        line.startsWith(`[data-theme="${name}"] .cc-err{`),
      );
      expect(rule).toBeDefined();
      for (const [key, value] of Object.entries(THEMES[name])) {
        expect(rule).toContain(`--${key}:${value}`);
      }
    },
  );

  it('falls back to Electric, and to Light for a light-mode system', () => {
    expect(THEME_TOKEN_CSS).toContain(`.cc-err{--bg:${THEMES.electric['bg']}`);
    expect(THEME_TOKEN_CSS).toContain(
      `@media (prefers-color-scheme: light){.cc-err{--bg:${THEMES.light['bg']}`,
    );
  });

  it('applies a stored theme only when it is a known one', () => {
    const run = (stored: string | null) => {
      document.documentElement.removeAttribute('data-theme');
      const storage = { getItem: () => stored };
      new Function('localStorage', 'document', THEME_PREPAINT_SCRIPT)(
        storage,
        document,
      );
      return document.documentElement.getAttribute('data-theme');
    };
    expect(run('jade')).toBe('jade');
    expect(run('constructor')).toBeNull();
    expect(run(null)).toBeNull();
  });
});
