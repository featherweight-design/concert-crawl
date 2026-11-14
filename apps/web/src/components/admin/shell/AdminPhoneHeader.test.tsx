// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const route = vi.hoisted(() => ({ pathname: '/admin/venues/venue-1' }));

vi.mock('next/navigation', () => ({
  usePathname: () => route.pathname,
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('./AdminUserMenu', () => ({
  PhoneUserMenu: () => <button type="button">Account</button>,
}));

import { AdminPhoneHeader } from './AdminTopbar';
import {
  PageTitleProvider,
  usePageTitle,
  type PhoneBack,
} from './PageTitleContext';

const user = { firstName: 'Admin', handle: null, email: 'admin@example.com' };

const Page = ({ title, back }: { title: string; back?: PhoneBack }) => {
  const { setPageTitle, setPhoneBack } = usePageTitle();
  useEffect(() => {
    setPageTitle(title);
    if (back) setPhoneBack(back);
  }, [title, back, setPageTitle, setPhoneBack]);
  return null;
};

const renderHeader = (back?: PhoneBack) =>
  render(
    <PageTitleProvider>
      <AdminPhoneHeader user={user} />
      <Page title="Hi-Dive" {...(back ? { back } : {})} />
    </PageTitleProvider>,
  );

afterEach(() => {
  cleanup();
  route.pathname = '/admin/venues/venue-1';
});

describe('AdminPhoneHeader', () => {
  it('shows the page title and the account menu by default', () => {
    renderHeader();
    expect(screen.getByText('Hi-Dive')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument();
    expect(screen.queryByTestId('admin-phone-back')).toBeNull();
  });

  // venue-overview-m and source-feed-edited draw "‹ Venues" in its place.
  it('shows only the back link when the page asks for one', () => {
    renderHeader({ label: 'Venues', href: '/admin/venues' });
    expect(screen.getByRole('link', { name: 'Venues' })).toHaveAttribute(
      'href',
      '/admin/venues',
    );
    expect(screen.queryByText('Hi-Dive')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Account' })).toBeNull();
  });

  // Leaving the venue page must give the next route its title bar back.
  it('brings the title bar back when the page that set the link unmounts', () => {
    const back = { label: 'Venues', href: '/admin/venues' };
    const Owner = () => {
      const { setPhoneBack } = usePageTitle();
      useEffect(() => {
        setPhoneBack(back);
        return () => setPhoneBack(null);
      }, [setPhoneBack]);
      return null;
    };
    const { rerender } = render(
      <PageTitleProvider>
        <AdminPhoneHeader user={user} />
        <Page title="Hi-Dive" />
        <Owner />
      </PageTitleProvider>,
    );
    expect(screen.getByTestId('admin-phone-back')).toBeInTheDocument();
    rerender(
      <PageTitleProvider>
        <AdminPhoneHeader user={user} />
        <Page title="Hi-Dive" />
      </PageTitleProvider>,
    );
    expect(screen.queryByTestId('admin-phone-back')).toBeNull();
    expect(screen.getByText('Hi-Dive')).toBeInTheDocument();
  });

  // `07/invite-codes-mobile`, `07/posters-mobile`: "People" with the tab
  // under it at 12.5px muted, 2px down.
  it.each([
    ['/admin/people/invite-codes', 'Invite codes'],
    ['/admin/people/invite-codes/posters', 'Posters'],
  ])('titles %s People with %s underneath', (pathname, tab) => {
    route.pathname = pathname;
    render(
      <PageTitleProvider>
        <AdminPhoneHeader user={user} />
      </PageTitleProvider>,
    );
    expect(screen.getByText('People')).toBeInTheDocument();
    const subtitle = screen.getByTestId('admin-phone-subtitle');
    expect(subtitle).toHaveTextContent(tab);
    expect(subtitle.style.fontSize).toBe('12.5px');
    expect(subtitle.style.color).toBe('var(--fg-muted)');
    expect(subtitle.style.marginTop).toBe('2px');
  });

  it('draws no second line on People itself', () => {
    route.pathname = '/admin/people';
    render(
      <PageTitleProvider>
        <AdminPhoneHeader user={user} />
      </PageTitleProvider>,
    );
    expect(screen.getByText('People')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-phone-subtitle')).toBeNull();
  });
});
