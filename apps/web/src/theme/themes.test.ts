import { describe, it, expect } from 'vitest';
import { AA_TEXT_CONTRAST, contrastRatio } from './contrast';
import { THEMES, THEME_NAMES, type ThemeName } from './themes';

const REQUIRED_TOKENS = [
  'bg',
  'bg-elevated',
  'surface-1',
  'surface-2',
  'surface-3',
  'fg',
  'fg-muted',
  'fg-subtle',
  'fg-on-accent',
  'border',
  'border-strong',
  'border-focus',
  'signal',
  'signal-muted',
  'accent',
  'accent-2',
  'accent-muted',
  'success',
  'warning',
  'danger',
  'trust-community',
  'trust-resale',
  'focus',
  'overlay-hover',
  'overlay-press',
  'scrim',
  'image-tint',
  'shadow-soft',
  'shadow-strong',
  // Derived by contrast in `withDerived`, not hand-listed.
  'toast-action',
] as const;

const ALL_THEME_NAMES: ThemeName[] = [
  'electric',
  'jade',
  'light',
  'pulse',
  'forge',
  'bluenote',
  'drip',
  'cedar',
  'gloss',
];

describe('THEMES', () => {
  it('exports all nine themes', () => {
    expect(Object.keys(THEMES).sort()).toEqual([...ALL_THEME_NAMES].sort());
  });

  it('THEME_NAMES matches THEMES keys', () => {
    expect([...THEME_NAMES].sort()).toEqual(Object.keys(THEMES).sort());
  });

  for (const name of ALL_THEME_NAMES) {
    describe(`theme: ${name}`, () => {
      it('contains every required token', () => {
        for (const token of REQUIRED_TOKENS) {
          expect(THEMES[name], `missing token --${token}`).toHaveProperty(
            token,
          );
        }
      });

      it('has exactly the required number of tokens', () => {
        expect(Object.keys(THEMES[name]).length).toBe(REQUIRED_TOKENS.length);
      });

      it('has no undefined or empty token values', () => {
        for (const [token, value] of Object.entries(THEMES[name])) {
          expect(typeof value, `--${token} is not a string`).toBe('string');
          expect(value.length, `--${token} is empty`).toBeGreaterThan(0);
        }
      });

      // The toast action sits on `--surface-3`. It must read at AA, and it
      // stays the board's `--signal` wherever `--signal` itself does.
      it('draws the toast action at AA on surface-3, keeping signal where it passes', () => {
        const tokens = THEMES[name];
        const ground = tokens['surface-3'] ?? '';
        const action = tokens['toast-action'] ?? '';
        const signalRatio = contrastRatio(tokens.signal ?? '', ground);
        expect(signalRatio).not.toBeNull();
        expect(
          contrastRatio(action, ground),
          `--toast-action ${action} on --surface-3 ${ground}`,
        ).toBeGreaterThanOrEqual(AA_TEXT_CONTRAST);
        expect(action).toBe(
          (signalRatio ?? 0) >= AA_TEXT_CONTRAST ? tokens.signal : tokens.fg,
        );
      });
    });
  }
});
