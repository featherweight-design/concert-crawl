import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { PHONE_SHELL_CLASS } from '@/components/consumer/app-shell/phone-shell';

// layout.tsx loads its fonts via next/font/google, which isn't available in
// the vitest environment; stub it so the module's viewport export imports.
const stubFont = () => ({ variable: '--font-stub', className: 'font-stub' });
vi.mock('next/font/google', () => ({
  Inter: stubFont,
  JetBrains_Mono: stubFont,
  Caveat: stubFont,
}));

const { viewport } = await import('./layout');

const tokens = (className: string): string[] => className.split(/\s+/);

// The root layout renders <html>, which testing-library cannot mount, so the
// body's class list is read from the JSX attribute itself (not from a comment
// that could mention the class).
const bodyClassTokens = (): string[] => {
  const source = readFileSync(resolve(__dirname, 'layout.tsx'), 'utf8');
  const match = /<body\s+className="([^"]+)"/.exec(source);
  return match?.[1] ? tokens(match[1]) : [];
};

// The phone shell was taller than the screen at scroll-top, and the bottom
// nav's buttons sat under the Android gesture bar. Each cause is pinned.
describe('mobile viewport shell', () => {
  // Without `cover`, every env(safe-area-inset-*) resolves to 0, so the
  // BottomNav's inset padding was dead code.
  it('opts into safe-area insets', () => {
    expect(viewport.viewportFit).toBe('cover');
  });

  // `100vh` (min-h-screen) is the largest viewport, browser bars retracted.
  it('sizes the body to the dynamic viewport', () => {
    const body = bodyClassTokens();
    expect(body).toContain('min-h-dvh');
    expect(body).not.toContain('min-h-screen');
  });

  it('sizes the phone shell to the dynamic viewport', () => {
    const shell = tokens(PHONE_SHELL_CLASS);
    expect(shell).toContain('min-h-dvh');
    expect(shell).not.toContain('min-h-screen');
  });

  // The pages outside the phone shell had the same bug: `100vh` is the
  // largest viewport, so each was a toolbar taller than the screen.
  it.each([
    'legal/terms/page.tsx',
    'legal/privacy/page.tsx',
    'legal/beta/page.tsx',
    'sign-in/[[...sign-in]]/page.tsx',
    'sign-up/[[...sign-up]]/page.tsx',
    'bot/page.tsx',
    '(protected)/(main)/events/[id]/submissions/[submissionId]/dispute/page.tsx',
    '(protected)/admin/layout.tsx',
    '../components/pwa/OfflineFallback.tsx',
    '../components/standalone-error/StandaloneError.tsx',
    '../components/admin/primitives/SidePanel.tsx',
  ])('%s sizes to the dynamic viewport', (file) => {
    const source = readFileSync(resolve(__dirname, file), 'utf8');
    expect(source).not.toMatch(/min-h-screen|\bh-screen\b|\b100[sl]?vh\b/);
    expect(source).toMatch(/min-h-dvh|\b100dvh\b/);
  });

  it('pads the phone shell for every live inset', () => {
    const shell = tokens(PHONE_SHELL_CLASS);
    expect(shell).toContain('pb-[env(safe-area-inset-bottom)]');
    expect(shell).toContain('lg:pb-0');
    expect(shell).toContain('pl-[env(safe-area-inset-left)]');
    expect(shell).toContain('pr-[env(safe-area-inset-right)]');
  });
});
