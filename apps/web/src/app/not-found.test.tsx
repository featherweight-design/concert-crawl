// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { PHONE_SHELL_CLASS } from '@/components/consumer/app-shell/phone-shell';
import GlobalNotFound from './not-found';

// The chrome reads Clerk, the router and the query client; what matters here is
// that the global 404 mounts it, so each piece is a marker.
vi.mock('@/components/consumer/app-header', () => ({
  AppHeader: () => <header data-testid="app-header" />,
}));
vi.mock('@/components/consumer/bottom-nav', () => ({
  BottomNav: () => <nav data-testid="bottom-nav" />,
}));
vi.mock('@/components/consumer/search-palette/SearchPaletteProvider', () => ({
  SearchPaletteProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock('@/components/consumer/user-menu', () => ({
  AccountMenuProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock('@/components/pwa/OfflinePill', () => ({ OfflinePill: () => null }));

const copy = CONSUMER_COPY.notFound;

afterEach(cleanup);

describe('global not-found', () => {
  it('draws the board: 404 tile, NOT FOUND eyebrow, heading and Browse shows', () => {
    render(<GlobalNotFound />);

    expect(screen.getByTestId('not-found-surface')).toBeDefined();
    expect(screen.getByTestId('not-found-tile').textContent).toBe(copy.code);
    expect(screen.getByText(copy.eyebrow)).toBeDefined();
    expect(screen.getByRole('heading', { name: copy.heading })).toBeDefined();
    const link = screen.getByRole('link', { name: copy.browseButton });
    expect(link.getAttribute('href')).toBe('/events');
    expect(link.getAttribute('style')).toContain('linear-gradient');
  });

  it('sits inside the app chrome: header, bottom nav and the page glow', () => {
    const { container } = render(<GlobalNotFound />);

    expect(screen.getByTestId('app-header')).toBeDefined();
    expect(screen.getByTestId('bottom-nav')).toBeDefined();
    expect(container.querySelector('.page-ambient')).not.toBeNull();
  });

  it('uses the shared phone shell, so the 404 keeps the viewport and inset sizing', () => {
    render(<GlobalNotFound />);
    expect(screen.getByTestId('phone-shell').className).toBe(PHONE_SHELL_CLASS);
  });

  // 48px sat under the 52px BottomNav; the phone gets the 80px every page
  // under the nav keeps.
  it('clears the bottom nav on the phone', () => {
    render(<GlobalNotFound />);
    const surface = screen.getByTestId('not-found-surface');
    const classes = surface.className.split(/\s+/);
    expect(classes).toContain('max-lg:pb-20');
    expect(classes).toContain('pb-12');
    expect(surface.style.paddingBottom).toBe('');
  });
});
