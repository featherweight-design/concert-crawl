// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/venues/venue-1',
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

afterEach(cleanup);

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
});
