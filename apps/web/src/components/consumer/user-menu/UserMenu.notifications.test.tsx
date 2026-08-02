// @vitest-environment jsdom

// #737 PR-C — the notification chrome that hangs off the account menu.
//
// Two things this file exists to nail down, because both have failed silently
// before: (1) the pip must NEVER appear for an anonymous visitor on EITHER
// trigger, and (2) mobile and desktop are the same feature — every panel state
// is asserted in the popover AND in the sheet, so parity is a test rather than
// a claim in a PR description.

import React from 'react'
import '@testing-library/jest-dom'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import {
  render,
  screen,
  cleanup,
  act,
  within,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type * as NotificationsModule from '@/lib/notifications'
import type {
  ConsumerNotification,
  NotificationListResult,
} from '@/lib/notifications'
import { AccountMenuProvider, UserMenu } from './UserMenu'
import { BottomNav } from '@/components/consumer/bottom-nav/BottomNav'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { NOTIFICATIONS_COPY } from '@/components/consumer/notifications/definitions/copy'

const LABELS = CONSUMER_COPY.userMenu.ariaLabels

const fetchMe = vi.fn()
const patchMe = vi.fn()

vi.mock('@/lib/users', () => ({
  fetchMe: (...args: unknown[]) => fetchMe(...args),
  patchMe: (...args: unknown[]) => patchMe(...args),
}))

const fetchNotifications = vi.fn()
const markNotificationRead = vi.fn()
const markAllNotificationsRead = vi.fn()
const markPanelSeen = vi.fn()

// Partial: the category map imports the real parsers from this module, so only
// the four network calls are replaced.
vi.mock('@/lib/notifications', async (importOriginal) => ({
  ...(await importOriginal<typeof NotificationsModule>()),
  fetchNotifications: (...args: unknown[]) => fetchNotifications(...args),
  markNotificationRead: (...args: unknown[]) => markNotificationRead(...args),
  markAllNotificationsRead: (...args: unknown[]) =>
    markAllNotificationsRead(...args),
  markPanelSeen: (...args: unknown[]) => markPanelSeen(...args),
}))

let mockAuth: {
  isSignedIn: boolean
  isLoaded: boolean
  userId: string | null
  getToken: () => Promise<string | null>
  sessionClaims: null
}

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => mockAuth,
  useUser: () => ({
    user: mockAuth.userId
      ? {
          id: mockAuth.userId,
          emailAddresses: [{ emailAddress: 'hugh@example.com' }],
        }
      : null,
  }),
  useClerk: () => ({ signOut: vi.fn() }),
}))

let mockPathname = '/events'
const routerPush = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: routerPush }),
}))

vi.mock('../search-palette/SearchPalette', () => ({
  SearchPalette: () => null,
}))

vi.mock('@/theme', () => ({
  useTheme: () => ({ theme: 'electric', setTheme: vi.fn() }),
}))

const notification = (
  over: Partial<ConsumerNotification> = {},
): ConsumerNotification => ({
  id: 'n1',
  category: 'watch.pricedrop',
  title: 'The price for Geese at Bluebird Theater dropped from $41 to $28.',
  body: "Cheapest it's been since the on-sale.",
  actionUrl: '/events/e1',
  readAt: null,
  createdAt: '2026-07-24T18:10:00-06:00',
  metadata: null,
  ...over,
})

const page = (
  items: ConsumerNotification[],
  unreadCount: number,
): NotificationListResult => ({
  items,
  unreadCount,
  seenAt: null,
  hasMore: false,
  nextCursor: null,
})

/** Widen (false) or narrow (true) the viewport around the `sm` breakpoint. */
function setViewport(isMobile: boolean): void {
  window.matchMedia = (query: string) => ({
    matches: isMobile,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}

function signIn(): void {
  mockAuth = {
    isSignedIn: true,
    isLoaded: true,
    userId: 'user_1',
    getToken: async () => 'token',
    sessionClaims: null,
  }
}

beforeEach(() => {
  mockAuth = {
    isSignedIn: false,
    isLoaded: true,
    userId: null,
    getToken: async () => null,
    sessionClaims: null,
  }
  mockPathname = '/events'
  routerPush.mockReset()
  fetchMe.mockReset()
  fetchMe.mockResolvedValue({
    handle: 'hugh',
    avatarColor: 'signal',
    submissionCount: 0,
    theme: 'electric',
  })
  patchMe.mockReset()
  fetchNotifications.mockReset()
  fetchNotifications.mockResolvedValue(page([notification()], 1))
  markNotificationRead.mockReset()
  markNotificationRead.mockResolvedValue(undefined)
  markAllNotificationsRead.mockReset()
  markAllNotificationsRead.mockResolvedValue(0)
  markPanelSeen.mockReset()
  markPanelSeen.mockResolvedValue(new Date().toISOString())
  localStorage.clear()
  setViewport(false)
})

afterEach(cleanup)

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchInterval: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

async function renderChrome(
  ui: React.ReactNode = (
    <>
      <UserMenu />
      <BottomNav />
    </>
  ),
): Promise<void> {
  await act(async () => {
    render(
      <QueryClientProvider client={makeClient()}>
        <AccountMenuProvider>{ui}</AccountMenuProvider>
      </QueryClientProvider>,
    )
  })
}

const desktopTrigger = (): HTMLElement => {
  const [first] = screen.getAllByRole('button', {
    name: (name) => name.startsWith('Account menu'),
  })
  if (!first) throw new Error('no account-menu trigger rendered')
  return first
}

const navTrigger = (): HTMLElement =>
  within(
    screen.getByRole('navigation', {
      name: CONSUMER_COPY.bottomNav.nav.ariaLabel,
    }),
  ).getByRole('button', { name: (name) => name.startsWith('Account menu') })

async function click(el: HTMLElement): Promise<void> {
  await act(async () => {
    el.click()
  })
}

/** Every pip in the tree, found by the class the reduced-motion rule targets. */
const pips = (): Element[] =>
  Array.from(document.querySelectorAll('.notif-pip'))

describe('#737 pip — anonymous visitors', () => {
  it('never renders a pip on either trigger when signed out', async () => {
    // Even if a stale cache handed the provider a count, `isSignedIn` is the
    // hard gate: notifications belong to an account that does not exist here.
    fetchNotifications.mockResolvedValue(page([notification()], 5))
    await renderChrome()

    expect(pips()).toHaveLength(0)
    // The query itself must stay disabled — no token, no request.
    expect(fetchNotifications).not.toHaveBeenCalled()
    expect(desktopTrigger().getAttribute('aria-label')).toBe(
      LABELS.accountMenuSignedOut,
    )
    expect(navTrigger().getAttribute('aria-label')).toBe(
      LABELS.accountMenuSignedOut,
    )
  })

  it('gives a signed-out visitor no inbox strip in the menu body', async () => {
    await renderChrome(<UserMenu />)
    await click(desktopTrigger())

    expect(screen.queryByText(NOTIFICATIONS_COPY.menuRow)).toBeNull()
    expect(screen.queryByText(NOTIFICATIONS_COPY.panelTitle)).toBeNull()
  })
})

describe('#737 pip — signed in', () => {
  it('rides both triggers and puts the count in each accessible name', async () => {
    signIn()
    fetchNotifications.mockResolvedValue(page([notification()], 3))
    await renderChrome()

    expect(pips()).toHaveLength(2)
    for (const trigger of [desktopTrigger(), navTrigger()]) {
      expect(trigger.getAttribute('aria-label')).toBe(
        LABELS.accountMenuUnread(3),
      )
    }
  })

  it('uses the singular noun for a single unread', async () => {
    signIn()
    fetchNotifications.mockResolvedValue(page([notification()], 1))
    await renderChrome()

    expect(desktopTrigger().getAttribute('aria-label')).toBe(
      'Account menu, 1 unread notification',
    )
  })

  it('drops the pip and the count label at zero unread', async () => {
    signIn()
    fetchNotifications.mockResolvedValue(page([], 0))
    await renderChrome()

    expect(pips()).toHaveLength(0)
    expect(desktopTrigger().getAttribute('aria-label')).toBe(LABELS.accountMenu)
  })

  it('still shows the pip while the bottom-nav avatar is a skeleton', async () => {
    signIn()
    // A profile fetch that never settles is exactly the window where a pip
    // would otherwise be swallowed — the one signal that something happened.
    fetchMe.mockReturnValue(new Promise(() => {}))
    await renderChrome(<BottomNav />)

    expect(screen.getByTestId('me-avatar-skeleton')).toBeInTheDocument()
    await waitFor(() => expect(pips()).toHaveLength(1))
  })

  it('announces the count in a polite live region, empty at zero', async () => {
    signIn()
    fetchNotifications.mockResolvedValue(page([notification()], 2))
    await renderChrome(<UserMenu />)

    const live = screen.getByRole('status')
    expect(live).toHaveAttribute('aria-live', 'polite')
    expect(live).toHaveTextContent(LABELS.unreadAnnouncement(2))

    cleanup()
    fetchNotifications.mockResolvedValue(page([], 0))
    await renderChrome(<UserMenu />)
    expect(screen.getByRole('status')).toHaveTextContent('')
  })
})

describe('#737 inbox strip', () => {
  it('previews at most two unread rows and links to the rest', async () => {
    signIn()
    fetchNotifications.mockResolvedValue(
      page(
        [
          notification({ id: 'a', title: 'Alpha dropped' }),
          notification({ id: 'bb', title: 'Bravo dropped' }),
          notification({ id: 'cc', title: 'Charlie dropped' }),
        ],
        3,
      ),
    )
    await renderChrome(<UserMenu />)
    await click(desktopTrigger())

    expect(screen.getByText(NOTIFICATIONS_COPY.panelTitle)).toBeInTheDocument()
    expect(screen.getByText('Alpha dropped')).toBeInTheDocument()
    expect(screen.getByText('Bravo dropped')).toBeInTheDocument()
    expect(screen.queryByText('Charlie dropped')).toBeNull()
    expect(
      screen.getByRole('button', { name: NOTIFICATIONS_COPY.seeAll(3) }),
    ).toBeInTheDocument()
  })

  it('collapses to one all-caught-up row at zero unread', async () => {
    signIn()
    fetchNotifications.mockResolvedValue(page([], 0))
    await renderChrome(<UserMenu />)
    await click(desktopTrigger())

    const row = screen.getByRole('button', {
      name: NOTIFICATIONS_COPY.bellLabel(0),
    })
    expect(
      within(row).getByText(NOTIFICATIONS_COPY.menuRow),
    ).toBeInTheDocument()
    expect(
      within(row).getByText(NOTIFICATIONS_COPY.markedAll),
    ).toBeInTheDocument()
  })

  it('never claims "All caught up." while the count says otherwise', async () => {
    signIn()
    // The window-wide count is the truth; the LOADED page can hold no unread
    // rows while the account still has five. Saying "All caught up." here
    // contradicts the same row's own "5 unread" label — and the pip that sent
    // them here.
    fetchNotifications.mockResolvedValue(
      page([notification({ readAt: '2026-07-24T19:00:00-06:00' })], 5),
    )
    await renderChrome(<UserMenu />)
    await click(desktopTrigger())

    const row = screen.getByRole('button', {
      name: NOTIFICATIONS_COPY.bellLabel(5),
    })
    expect(within(row).queryByText(NOTIFICATIONS_COPY.markedAll)).toBeNull()
  })

  it('opens the panel from the collapsed row on Enter and on Space', async () => {
    signIn()
    fetchNotifications.mockResolvedValue(page([], 0))
    await renderChrome(<UserMenu />)

    for (const key of ['Enter', ' ']) {
      await click(desktopTrigger())
      const row = screen.getByRole('button', {
        name: NOTIFICATIONS_COPY.bellLabel(0),
      })
      const event = new KeyboardEvent('keydown', { key, bubbles: true })
      const prevented = vi.spyOn(event, 'preventDefault')
      await act(async () => {
        row.dispatchEvent(event)
      })
      // Space must be swallowed or the surface scrolls under the menu.
      if (key === ' ') expect(prevented).toHaveBeenCalled()
      expect(
        screen.getByRole('button', { name: NOTIFICATIONS_COPY.menuBack }),
      ).toBeInTheDocument()
      // Reset for the next key.
      await act(async () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })
    }
  })
})

describe('#737 notifications mode — one shell, one escape', () => {
  async function enterPanel(): Promise<void> {
    await click(desktopTrigger())
    await click(
      screen.getByRole('button', {
        name: (name) =>
          name === NOTIFICATIONS_COPY.seeAll(1) ||
          name === NOTIFICATIONS_COPY.bellLabel(0),
      }),
    )
  }

  it('swaps into the SAME dialog rather than opening a second one', async () => {
    signIn()
    await renderChrome(<UserMenu />)
    const before = screen.queryAllByRole('dialog')
    await enterPanel()

    expect(screen.queryAllByRole('dialog')).toHaveLength(1)
    expect(before).toHaveLength(0)
    expect(screen.queryByText(CONSUMER_COPY.userMenu.sections.app)).toBeNull()
  })

  it('renames the dialog when the body swaps, on both shells', async () => {
    // The swap replaces the ENTIRE surface. A dialog that keeps announcing
    // "Account" tells a screen-reader user nothing happened at the one moment
    // the accessible name is load-bearing.
    for (const isMobile of [false, true]) {
      cleanup()
      setViewport(isMobile)
      signIn()
      await renderChrome(<UserMenu />)
      await click(desktopTrigger())
      expect(screen.getByRole('dialog')).toHaveAccessibleName(
        CONSUMER_COPY.userMenu.ariaLabels.menuTitle,
      )

      await click(
        screen.getByRole('button', { name: NOTIFICATIONS_COPY.seeAll(1) }),
      )
      expect(screen.getByRole('dialog')).toHaveAccessibleName(
        NOTIFICATIONS_COPY.panelTitle,
      )
    }
  })

  it('marks the panel seen exactly once per entry', async () => {
    signIn()
    await renderChrome(<UserMenu />)
    await enterPanel()

    expect(markPanelSeen).toHaveBeenCalledTimes(1)
  })

  it('moves focus into the panel on entry', async () => {
    signIn()
    await renderChrome(<UserMenu />)
    await enterPanel()

    const back = screen.getByRole('button', {
      name: NOTIFICATIONS_COPY.menuBack,
    })
    expect(back.parentElement).toBe(document.activeElement)
  })

  it('returns to the menu body from the back row', async () => {
    signIn()
    await renderChrome(<UserMenu />)
    await enterPanel()
    await click(
      screen.getByRole('button', { name: NOTIFICATIONS_COPY.menuBack }),
    )

    expect(
      screen.getByText(CONSUMER_COPY.userMenu.sections.app),
    ).toBeInTheDocument()
  })

  it('closes the WHOLE menu on Escape instead of popping back', async () => {
    signIn()
    await renderChrome(<UserMenu />)
    await enterPanel()

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(desktopTrigger())
  })

  it('reopens on the menu body, never on the panel it was closed from', async () => {
    signIn()
    await renderChrome(<UserMenu />)
    await enterPanel()
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    await click(desktopTrigger())

    expect(
      screen.getByText(CONSUMER_COPY.userMenu.sections.app),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: NOTIFICATIONS_COPY.menuBack }),
    ).toBeNull()
  })

  it('navigates and dismisses when a row is opened', async () => {
    signIn()
    await renderChrome(<UserMenu />)
    await enterPanel()

    const row = within(screen.getByRole('list')).getAllByRole('button')[0]
    if (!row) throw new Error('no notification row rendered')
    await act(async () => {
      row.click()
    })

    expect(markNotificationRead).toHaveBeenCalledWith('token', 'n1')
    expect(routerPush).toHaveBeenCalledWith('/events/e1')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

// Parity is the requirement, so the same table runs against both shells. The
// only difference between them is which one `matchMedia` selects.
describe.each([
  ['desktop popover', false],
  ['mobile sheet', true],
])('#737 panel parity — %s', (_label, isMobile) => {
  beforeEach(() => {
    setViewport(isMobile)
  })

  async function openPanel(): Promise<void> {
    await renderChrome(<UserMenu />)
    await click(desktopTrigger())
    const entry = screen.getByRole('button', {
      name: (name) =>
        name.startsWith('See ') || name === NOTIFICATIONS_COPY.bellLabel(0),
    })
    await click(entry)
  }

  it('renders the list state', async () => {
    signIn()
    await openPanel()
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: NOTIFICATIONS_COPY.markAll }),
    ).toBeInTheDocument()
  })

  it('renders the empty state', async () => {
    signIn()
    fetchNotifications.mockResolvedValue(page([], 0))
    await openPanel()
    expect(screen.getByText(NOTIFICATIONS_COPY.emptyTitle)).toBeInTheDocument()
  })

  it('renders the all-read state as a list with no mark-all affordance', async () => {
    signIn()
    fetchNotifications.mockResolvedValue(
      page([notification({ readAt: '2026-07-24T19:00:00-06:00' })], 0),
    )
    await openPanel()
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText(NOTIFICATIONS_COPY.markedAll)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: NOTIFICATIONS_COPY.markAll }),
    ).toBeNull()
  })

  it('renders the error state with a retry', async () => {
    signIn()
    fetchNotifications.mockRejectedValue(new Error('offline'))
    await openPanel()
    expect(screen.getByRole('alert')).toHaveTextContent(
      NOTIFICATIONS_COPY.error,
    )
    expect(
      screen.getByRole('button', { name: NOTIFICATIONS_COPY.errorAction }),
    ).toBeInTheDocument()
  })

  it('renders the loading state as a polite busy region', async () => {
    signIn()
    fetchNotifications.mockReturnValue(new Promise(() => {}))
    await openPanel()
    const busy = screen
      .getAllByRole('status')
      .find((el) => el.getAttribute('aria-busy') === 'true')
    expect(busy).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })
})
