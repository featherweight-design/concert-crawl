// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const { nav } = vi.hoisted(() => ({ nav: { pathname: '/admin', search: '' } }));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { MobileBottomBar } from './MobileBottomBar';
import { NEEDS_YOU_FAILED_ATTR } from './nav';

const renderAt = (pathname: string, needsYou = 0) => {
  nav.pathname = pathname;
  return render(<MobileBottomBar badgeCounts={{ needsYou }} />);
};

afterEach(cleanup);

describe('MobileBottomBar', () => {
  it('has four tabs in the drawn order', () => {
    renderAt('/admin/review');
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(
      [expect.stringContaining('Needs you'), 'Venues', 'Events', 'More'],
    );
  });

  it('makes More active for Feature flags', () => {
    renderAt('/admin/feature-flags');
    expect(screen.getByRole('link', { name: 'More' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'More' })).toHaveAttribute(
      'href',
      '/admin/more',
    );
  });

  it('keeps Venues active on a venue page', () => {
    renderAt('/admin/venues/abc');
    expect(screen.getByRole('link', { name: 'Venues' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('badges only Needs you', () => {
    renderAt('/admin', 3);
    expect(screen.getAllByTestId('admin-needs-you-badge')).toHaveLength(1);
  });

  it('hides the badge while Needs you couldn’t load (addendum-3 #21)', () => {
    renderAt('/admin/needs-you', 3);
    // The class admin.css hides under the root flag Needs you sets.
    expect(screen.getByTestId('admin-tab-bar-badge')).toHaveClass(
      'admin-tab-bar-badge',
    );
    const css = readFileSync(
      path.resolve(__dirname, '../../../app/(protected)/admin/admin.css'),
      'utf8',
    ).replace(/\s+/g, ' ');
    expect(css).toContain(
      `[${NEEDS_YOU_FAILED_ATTR}] .admin-tab-bar-badge { display: none; }`,
    );
  });
});
