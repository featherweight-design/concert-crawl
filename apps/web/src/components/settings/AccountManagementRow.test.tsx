// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { AccountManagementRow } from './AccountManagementRow';

const mockUseClerk = vi.fn(() => ({ openUserProfile: vi.fn() }));
const mockUseUser = vi.fn();

vi.mock('@clerk/nextjs', () => ({
  useClerk: () => mockUseClerk(),
  useUser: () => mockUseUser(),
}));

describe('AccountManagementRow', () => {
  // A test below swaps in its own spy; every test starts from the default.
  beforeEach(() => {
    mockUseClerk.mockReturnValue({ openUserProfile: vi.fn() });
  });

  it('opens Clerk profile when the email row is pressed', () => {
    const openUserProfile = vi.fn();
    mockUseClerk.mockReturnValue({ openUserProfile });
    mockUseUser.mockReturnValue({
      user: { passwordEnabled: false, externalAccounts: [] },
    });
    render(<AccountManagementRow email="test@example.com" />);
    const row = screen.getByText('test@example.com').closest('button');
    expect(row).not.toBeNull();
    if (row === null) return;
    fireEvent.click(row);
    expect(openUserProfile).toHaveBeenCalledTimes(1);
  });

  it('insets the rows 16px on mobile and 20px on the desktop panel', () => {
    mockUseUser.mockReturnValue({
      user: { passwordEnabled: false, externalAccounts: [] },
    });
    const mobile = render(<AccountManagementRow email="test@example.com" />);
    expect(
      screen.getByText('test@example.com').closest('button')?.className,
    ).toContain('px-4');
    mobile.unmount();
    render(<AccountManagementRow email="test@example.com" variant="desktop" />);
    expect(
      screen.getByText('test@example.com').closest('button')?.className,
    ).toContain('px-5');
  });

  it('shows email row', () => {
    mockUseUser.mockReturnValue({
      user: { passwordEnabled: false, externalAccounts: [] },
    });
    render(<AccountManagementRow email="test@example.com" />);
    expect(screen.getByText('test@example.com')).toBeTruthy();
  });

  it('shows no connected accounts section when externalAccounts is empty', () => {
    mockUseUser.mockReturnValue({
      user: { passwordEnabled: false, externalAccounts: [] },
    });
    render(<AccountManagementRow email="test@example.com" />);
    expect(screen.queryByText('Connected Account')).toBeNull();
  });

  it('shows connected account row for oauth_google', () => {
    mockUseUser.mockReturnValue({
      user: {
        passwordEnabled: false,
        externalAccounts: [{ provider: 'oauth_google' }],
      },
    });
    render(<AccountManagementRow email="test@example.com" />);
    expect(screen.getByText('Connected Account')).toBeTruthy();
    expect(screen.getByText('Google')).toBeTruthy();
  });

  it('shows connected account row for oauth_spotify', () => {
    mockUseUser.mockReturnValue({
      user: {
        passwordEnabled: false,
        externalAccounts: [{ provider: 'oauth_spotify' }],
      },
    });
    render(<AccountManagementRow email="test@example.com" />);
    expect(screen.getByText('Spotify')).toBeTruthy();
  });

  it('shows multiple connected accounts', () => {
    mockUseUser.mockReturnValue({
      user: {
        passwordEnabled: false,
        externalAccounts: [
          { provider: 'oauth_google' },
          { provider: 'oauth_spotify' },
        ],
      },
    });
    render(<AccountManagementRow email="test@example.com" />);
    expect(screen.getByText('Google')).toBeTruthy();
    expect(screen.getByText('Spotify')).toBeTruthy();
  });

  it('renders Clerk privacy footnote link', () => {
    mockUseUser.mockReturnValue({
      user: { passwordEnabled: false, externalAccounts: [] },
    });
    render(<AccountManagementRow email="test@example.com" />);
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeTruthy();
  });

  it('still shows password row when passwordEnabled is true', () => {
    mockUseUser.mockReturnValue({
      user: { passwordEnabled: true, externalAccounts: [] },
    });
    render(<AccountManagementRow email="test@example.com" />);
    expect(screen.getByText(/password/i)).toBeTruthy();
  });
});
