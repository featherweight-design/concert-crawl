// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const { nav } = vi.hoisted(() => ({ nav: { pathname: '/admin', search: '' } }));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { MobileBottomBar } from './MobileBottomBar';

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
});
