// @vitest-environment jsdom

// Share Concert Crawl's account-menu row: where it sits for each combination
// of signed-in state and launch mode, and that pressing it closes the menu and
// opens the sheet. The sheet itself is covered in share-app/ShareAppSheet.test.

import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as NotificationsModule from '@/lib/notifications';
import { AccountMenuProvider, UserMenu } from './UserMenu';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const ROW = CONSUMER_COPY.userMenu.rows.shareApp;
const SECTIONS = CONSUMER_COPY.userMenu.sections;

const fetchMe = vi.fn();

vi.mock('@/lib/users', () => ({
  fetchMe: (...args: unknown[]) => fetchMe(...args),
  patchMe: vi.fn(),
}));

vi.mock('@/lib/notifications', async (importOriginal) => ({
  ...(await importOriginal<typeof NotificationsModule>()),
  fetchNotifications: async () => ({
    items: [],
    unreadCount: 0,
    seenAt: null,
    hasMore: false,
    nextCursor: null,
  }),
}));

// The real one is a dynamic import of the QR sheet; the row only needs to know
// that it was opened, and in which mode.
vi.mock('@/components/consumer/share-app/lazy', () => ({
  ShareAppSheet: (props: { open: boolean; mode: string }) =>
    props.open ? (
      <div data-testid="share-sheet" data-mode={props.mode} />
    ) : null,
}));

let signedIn = false;

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    isSignedIn: signedIn,
    isLoaded: true,
    userId: signedIn ? 'user_1' : null,
    getToken: async () => (signedIn ? 'token' : null),
    sessionClaims: null,
  }),
  useUser: () => ({
    user: signedIn
      ? { id: 'user_1', emailAddresses: [{ emailAddress: 'a@example.com' }] }
      : null,
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

/** Desktop: the popover, not the phone sheet. */
function setViewport(): void {
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
}

beforeEach(() => {
  signedIn = false;
  fetchMe.mockReset();
  fetchMe.mockResolvedValue({
    handle: 'hugh',
    avatarColor: 'signal',
    avatarSecondColor: null,
    submissionCount: 0,
    theme: 'electric',
  });
  localStorage.clear();
  setViewport();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

async function openMenu(): Promise<void> {
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
}

/** True when `first` comes before `second` in document order. */
const before = (first: Element, second: Element): boolean =>
  Boolean(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
  );

describe('Share Concert Crawl row', () => {
  it('is the last row in You, after Submitted prices, when signed in before launch', async () => {
    signedIn = true;
    await openMenu();

    const row = screen.getByRole('button', { name: ROW });
    const prices = screen.getByText(
      CONSUMER_COPY.userMenu.rows.submittedPrices,
    );
    expect(before(prices, row)).toBe(true);
    // Before the App section starts, so it ends You.
    expect(before(row, screen.getByText(SECTIONS.app))).toBe(true);
  });

  it('is there after launch too when signed in, in the same place', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true');
    signedIn = true;
    await openMenu();

    const row = screen.getByRole('button', { name: ROW });
    expect(before(row, screen.getByText(SECTIONS.app))).toBe(true);
  });

  it('is absent when signed out before launch', async () => {
    await openMenu();
    // Positive control: the menu is open and the App section rendered, so the
    // absence below is the row's and not an empty menu's.
    expect(screen.getByText(SECTIONS.app)).toBeTruthy();
    expect(screen.queryByText(ROW)).toBeNull();
  });

  it('is the first row in App when signed out after launch', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true');
    await openMenu();

    const row = screen.getByRole('button', { name: ROW });
    expect(before(screen.getByText(SECTIONS.app), row)).toBe(true);
    expect(
      before(row, screen.getByText(CONSUMER_COPY.userMenu.rows.theme)),
    ).toBe(true);
  });

  it('closes the menu and opens the sheet in invite mode', async () => {
    signedIn = true;
    await openMenu();
    expect(screen.queryByTestId('share-sheet')).toBeNull();

    await act(async () => {
      screen.getByRole('button', { name: ROW }).click();
    });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('share-sheet').getAttribute('data-mode')).toBe(
      'invite',
    );
  });

  it('opens the sheet in open mode after launch', async () => {
    vi.stubEnv('NEXT_PUBLIC_PUBLIC_BROWSE', 'true');
    await openMenu();

    await act(async () => {
      screen.getByRole('button', { name: ROW }).click();
    });

    expect(screen.getByTestId('share-sheet').getAttribute('data-mode')).toBe(
      'open',
    );
  });
});
