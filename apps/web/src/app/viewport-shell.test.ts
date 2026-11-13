import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// layout.tsx loads its fonts via next/font/google, which isn't available in
// the vitest environment; stub it so the module's viewport export imports.
const stubFont = () => ({ variable: '--font-stub', className: 'font-stub' });
vi.mock('next/font/google', () => ({
  Inter: stubFont,
  JetBrains_Mono: stubFont,
  Caveat: stubFont,
}));

const { viewport } = await import('./layout');

const read = (path: string): string =>
  readFileSync(resolve(__dirname, path), 'utf8');

// The phone shell was taller than the screen at scroll-top, and the bottom
// nav's buttons sat under the Android gesture bar. Two causes, each pinned.
describe('mobile viewport shell', () => {
  // Without `cover`, every env(safe-area-inset-*) resolves to 0, so the
  // BottomNav's inset padding was dead code.
  it('opts into safe-area insets so the BottomNav can clear the gesture bar', () => {
    expect(viewport.viewportFit).toBe('cover');
  });

  // `100vh` (min-h-screen) is the largest viewport, browser bars retracted.
  it.each([
    ['root body', 'layout.tsx'],
    ['(main) shell', '(protected)/(main)/layout.tsx'],
    ['not-found shell', 'not-found.tsx'],
  ])('sizes the %s to the dynamic viewport', (_name, path) => {
    const source = read(path);
    expect(source).toContain('min-h-dvh');
    expect(source).not.toContain('min-h-screen');
  });

  it.each([
    ['(main) shell', '(protected)/(main)/layout.tsx'],
    ['not-found shell', 'not-found.tsx'],
  ])('pads the %s for the inset the BottomNav grows by', (_name, path) => {
    expect(read(path)).toContain('pb-[env(safe-area-inset-bottom)] sm:pb-0');
  });
});
