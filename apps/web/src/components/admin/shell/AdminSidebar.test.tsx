// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const { nav, signOut } = vi.hoisted(() => ({
  nav: { pathname: '/admin', search: '' },
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));
vi.mock('@clerk/nextjs', () => ({ useClerk: () => ({ signOut }) }));

import { AdminSidebar } from './AdminSidebar';

const user = { firstName: 'Hugh', handle: 'hugh', email: 'h@x.test' };

const renderAt = (pathname: string, search = '', needsYou = 0) => {
  nav.pathname = pathname;
  nav.search = search;
  return render(<AdminSidebar user={user} badgeCounts={{ needsYou }} />);
};

afterEach(cleanup);

describe('AdminSidebar', () => {
  it('marks the owning item active on a nested route', () => {
    renderAt('/admin/venues/abc');
    expect(screen.getByRole('link', { name: 'Venues' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Health' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  // `07/invite-codes`, `07/loading-invite-codes`: People lit, and the
  // interim Invite codes row is gone.
  it.each(['/admin/people/invite-codes', '/admin/people/invite-codes/posters'])(
    'lights People on %s and draws no Invite codes row',
    (pathname) => {
      renderAt(pathname);
      expect(screen.getByRole('link', { name: 'People' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(screen.queryByRole('link', { name: 'Invite codes' })).toBeNull();
    },
  );

  it('follows the interim Review tab', () => {
    renderAt('/admin/review', 'tab=all-events');
    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('shows the Needs you count and no other badge', () => {
    renderAt('/admin', '', 14);
    const badges = screen.getAllByTestId('admin-needs-you-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent('14');
    expect(
      screen.getByRole('link', { name: /Needs you.*14 decisions waiting/ }),
    ).toBeInTheDocument();
  });

  it('hides the badge at zero', () => {
    renderAt('/admin', '', 0);
    expect(screen.queryByTestId('admin-needs-you-badge')).toBeNull();
  });

  it('labels the groups and never says Tools', () => {
    renderAt('/admin');
    expect(screen.getByText('MANAGE')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM')).toBeInTheDocument();
    expect(screen.queryByText(/tools/i)).toBeNull();
  });

  it('opens the user menu from the user card', () => {
    renderAt('/admin');
    fireEvent.click(screen.getByTestId('admin-user-menu-trigger'));
    expect(screen.getByTestId('admin-user-menu')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Open Concert Crawl/ }),
    ).toHaveAttribute('href', '/events');
    fireEvent.click(screen.getByRole('button', { name: /Sign out/ }));
    expect(signOut).toHaveBeenCalledWith({ redirectUrl: '/' });
  });
});
