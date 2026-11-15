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
  'focus',
  'overlay-hover',
  'overlay-press',
  'scrim',
  'image-tint',
  'shadow-soft',
  'shadow-strong',
  // Derived by contrast in `withDerived`, not hand-listed.
  'toast-action',
  // Item 38: defaulted from signal / warning / danger in `withDerived`.
  'trust-community',
  'trust-boxoffice',
  'trust-resale',
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

// `tone` at 8% over `ground`, both `#RRGGBB`: the trust pill's fill.
const tintOver = (tone: string, ground: string): string => {
  const channel = (hex: string, at: number) =>
    parseInt(hex.slice(1 + at * 2, 3 + at * 2), 16);
  const mixed = [0, 1, 2].map((at) =>
    Math.round(channel(tone, at) * 0.08 + channel(ground, at) * 0.92)
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${mixed.join('')}`;
};

describe('trust tones (item 38)', () => {
  it('keeps signal, warning and danger in the five themes that do not change', () => {
    for (const name of [
      'electric',
      'jade',
      'pulse',
      'bluenote',
      'drip',
    ] as const) {
      expect(THEMES[name]['trust-community']).toBe(THEMES[name].signal);
      expect(THEMES[name]['trust-boxoffice']).toBe(THEMES[name].warning);
      expect(THEMES[name]['trust-resale']).toBe(THEMES[name].danger);
    }
  });

  it('draws the board values for Forge, Cedar, Gloss and Light', () => {
    expect(THEMES.forge['trust-community']).toBe('#8FB3D9');
    expect(THEMES.cedar['trust-community']).toBe('#8CC7E8');
    expect(THEMES.gloss['trust-community']).toBe('#A9B4FF');
    expect(THEMES.light['trust-community']).toBe('#006A85');
    expect(THEMES.light['trust-boxoffice']).toBe('#8F5500');
    expect(THEMES.light['trust-resale']).toBe('#B3243A');
    // Resale and Box office keep their defaults in the three dark themes.
    expect(THEMES.forge['trust-resale']).toBe(THEMES.forge.danger);
    expect(THEMES.cedar['trust-boxoffice']).toBe(THEMES.cedar.warning);
  });
});

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

      // Item 38: every trust pill reads at AA small text on its own 8% tint
      // over `--surface-1`, and a theme that names no trust colour keeps
      // `--signal`, `--warning` and `--danger`.
      it('draws every trust tone at AA on its own 8% tint over surface-1', () => {
        const tokens = THEMES[name];
        const ground = tokens['surface-1'] ?? '';
        for (const key of [
          'trust-community',
          'trust-boxoffice',
          'trust-resale',
        ] as const) {
          const tone = tokens[key] ?? '';
          expect(
            contrastRatio(tone, tintOver(tone, ground)),
            `--${key} ${tone} on ${name} surface-1`,
          ).toBeGreaterThanOrEqual(AA_TEXT_CONTRAST);
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
