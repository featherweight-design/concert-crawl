// @vitest-environment jsdom

// An account with no handle and no name reads "Your account" in the menu
// (addendum 3, lane 9d), never the email.

import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccountMenuProvider, UserMenu } from './UserMenu';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const fetchMe = vi.fn();

vi.mock('@/lib/users', () => ({
  fetchMe: (...args: unknown[]) => fetchMe(...args),
  patchMe: vi.fn(),
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    isSignedIn: true,
    isLoaded: true,
    userId: 'user_1',
    getToken: async () => 'token',
    sessionClaims: null,
  }),
  useUser: () => ({
    user: {
      id: 'user_1',
      fullName: null,
      firstName: null,
      emailAddresses: [{ emailAddress: 'a@example.com' }],
    },
  }),
  useClerk: () => ({ signOut: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/events',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/theme', () => ({
  useTheme: () => ({ theme: 'electric', setTheme: vi.fn() }),
}));

beforeEach(() => {
  fetchMe.mockReset();
  fetchMe.mockResolvedValue({
    handle: null,
    avatarColor: 'signal',
    avatarSecondColor: null,
    submissionCount: 0,
    theme: 'electric',
  });
  localStorage.clear();
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
});

afterEach(cleanup);

describe('UserMenu identity', () => {
  it('reads "Your account" with no handle and no name, never the email', async () => {
    await act(async () => {
      render(
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: { queries: { retry: false, gcTime: 0 } },
            })
          }
        >
          <AccountMenuProvider>
            <UserMenu />
          </AccountMenuProvider>
        </QueryClientProvider>,
      );
    });
    const trigger = screen.getByRole('button', {
      name: (name) => name.startsWith('Account menu'),
    });
    await act(async () => {
      trigger.click();
    });
    expect(
      screen.getAllByText(CONSUMER_COPY.userMenu.identityFallback).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText('a@example.com')).toBeNull();
  });
});
