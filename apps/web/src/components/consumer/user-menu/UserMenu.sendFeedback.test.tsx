// @vitest-environment jsdom

// The account menu's Send feedback row (fan-account-menu-send-feedback): last
// in App for a member, absent signed out, its New pill until the first open,
// and that pressing it closes the menu and opens the feedback modal. The modal
// itself is covered in feedback/FeedbackModal.test.

import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as NotificationsModule from '@/lib/notifications';
import { AccountMenuProvider, UserMenu } from './UserMenu';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const ROWS = CONSUMER_COPY.userMenu.rows;
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

vi.mock('@/components/consumer/share-app/lazy', () => ({
  ShareAppSheet: () => null,
}));

// The row only needs to know the modal was opened.
vi.mock('@/components/consumer/feedback/FeedbackModal', () => ({
  FeedbackModal: (props: { open: boolean }) =>
    props.open ? <div data-testid="feedback-modal" /> : null,
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

const sendFeedbackRow = (): HTMLElement =>
  screen.getByRole('button', {
    name: (name) => name.startsWith(ROWS.sendFeedback),
  });

describe('Send feedback row', () => {
  it('is the last row in App, after Settings, when signed in', async () => {
    signedIn = true;
    await openMenu();

    const row = sendFeedbackRow();
    expect(before(screen.getByText(ROWS.settings), row)).toBe(true);
    expect(before(screen.getByText(SECTIONS.app), row)).toBe(true);
  });

  it('is absent when signed out', async () => {
    await openMenu();
    // Positive control: the App section rendered, so the absence is the row's.
    expect(screen.getByText(SECTIONS.app)).toBeTruthy();
    expect(screen.queryByText(ROWS.sendFeedback)).toBeNull();
  });

  it('carries the New pill until the first open', async () => {
    signedIn = true;
    await openMenu();
    expect(sendFeedbackRow().textContent).toContain(ROWS.sendFeedbackNew);
  });

  it('closes the menu and opens the feedback modal', async () => {
    signedIn = true;
    await openMenu();
    expect(screen.queryByTestId('feedback-modal')).toBeNull();

    await act(async () => {
      sendFeedbackRow().click();
    });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('feedback-modal')).toBeTruthy();
  });

  it('drops the New pill once feedback has been opened on this device', async () => {
    signedIn = true;
    await openMenu();
    await act(async () => {
      sendFeedbackRow().click();
    });
    cleanup();

    await openMenu();
    expect(sendFeedbackRow().textContent).not.toContain(ROWS.sendFeedbackNew);
  });
});
