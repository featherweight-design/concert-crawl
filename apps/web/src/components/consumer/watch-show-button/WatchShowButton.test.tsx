// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { WatchingShow } from '@concert-crawl/types'

// ---- Mocks ---------------------------------------------------------------

let signedIn: boolean
let currentToken: string | null

vi.mock('next/navigation', () => ({
  usePathname: () => '/events/e1',
  // Both are read to build the signed-out sign-up link, which carries the
  // current view — query included — through auth.
  useSearchParams: () => new URLSearchParams({ tab: 'prices' }),
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    isSignedIn: signedIn,
    getToken: async () => currentToken,
  }),
}))

const watchingData = vi.fn<() => WatchingShow[]>(() => [])
vi.mock('@/lib/queries/use-watching', () => ({
  useWatching: () => ({ data: watchingData() }),
}))

const toggleMutate = vi.fn(
  (
    _eventId: string,
    opts?: { onSuccess?: () => void; onError?: (err: unknown) => void },
  ) => {
    // Fire onSuccess synchronously so tests can advance timers immediately.
    opts?.onSuccess?.()
  },
)
vi.mock('@/lib/queries/use-watch-toggle', () => ({
  useWatchToggle: () => ({
    isPending: false,
    mutate: toggleMutate,
  }),
}))

const prefsData = vi.fn<() => { masterEnabled: boolean } | undefined>(
  () => undefined,
)
const patchMutateAsyncMock = vi.fn(async (_updates: unknown) => ({
  masterEnabled: true,
  watchUpdatesEnabled: true,
  priceDropsEnabled: true,
}))
vi.mock('@/lib/queries/use-notification-preferences', () => ({
  useNotificationPreferences: () => ({ data: prefsData() }),
  usePatchNotificationPreferences: () => ({
    mutateAsync: patchMutateAsyncMock,
    isPending: false,
  }),
}))

const pushSupportMock = vi.fn<
  () => 'supported' | 'ios-needs-install' | 'unsupported'
>(() => 'supported')
const subscribeToPushMock = vi.fn(async (_token: string) => ({
  status: 'subscribed' as const,
  id: 'sub-row-1',
}))
const unsubscribeFromPushMock = vi.fn(async (_token: string, _id?: string) => ({
  status: 'unsubscribed' as const,
}))
vi.mock('@/lib/push/client', () => ({
  getPushSupport: () => pushSupportMock(),
  subscribeToPush: (token: string) => subscribeToPushMock(token),
  unsubscribeFromPush: (token: string, id?: string) =>
    unsubscribeFromPushMock(token, id),
}))

// The tier picker drags in the router, Stripe, and analytics. What matters
// here is whether the button opens it and with which funnel entry, so it is
// reduced to a marker that reports the props it received.
vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: ({ open, entry }: { open: boolean; entry: string }) =>
    open ? <div data-testid="tier-picker" data-entry={entry} /> : null,
}))

// ---- Component under test ------------------------------------------------

import { WatchShowButton } from './WatchShowButton'
import {
  hasDismissedPostWatchAsk,
  markPostWatchAskDismissed,
} from '@/lib/pwa/post-watch-dismissal'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const renderButton = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <WatchShowButton eventId="evt_1" initialWatching={false} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  // jsdom doesn't stub matchMedia — the component reads it inside a
  // useEffect. A minimal shim keeps the mobile branch inert (matches=false).
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  })
  signedIn = true
  currentToken = 'test-token'
  watchingData.mockReturnValue([])
  pushSupportMock.mockReturnValue('supported')
  toggleMutate.mockClear()
  subscribeToPushMock.mockClear()
  unsubscribeFromPushMock.mockClear()
  patchMutateAsyncMock.mockClear()
  subscribeToPushMock.mockResolvedValue({
    status: 'subscribed',
    id: 'sub-row-1',
  })
  patchMutateAsyncMock.mockResolvedValue({
    masterEnabled: true,
    watchUpdatesEnabled: true,
    priceDropsEnabled: true,
  })
  localStorage.clear()
  // Positive default: preferences GET has resolved with masterEnabled=false.
  // Tests that need the "already opted in" or "still loading" states
  // override this explicitly.
  prefsData.mockReturnValue({ masterEnabled: false })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// ---- Tests ---------------------------------------------------------------

describe('WatchShowButton — post-watch sheet integration (#1062)', () => {
  it('fires the sheet ~500ms after a first successful watch', async () => {
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: /watch/i }))
    // No sheet yet — 500ms not elapsed.
    expect(
      screen.queryByRole('button', { name: /turn on notifications/i }),
    ).toBeNull()
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    // Post-act flush leaves the DOM current; no waitFor needed under fake
    // timers (waitFor internally polls setTimeout, which is faked).
    expect(
      screen.getByRole('button', { name: /turn on notifications/i }),
    ).not.toBeNull()
  })

  it('does not fire the sheet when un-watching an already-watching show', async () => {
    watchingData.mockReturnValue([
      {
        userEventId: 'ue_1',
        eventId: 'evt_1',
        artist: 'A',
        venueName: 'V',
        venueSlug: 'v',
        date: '2026-08-14',
        showTime: null,
        ticketUrl: null,
        ticketLinks: null,
        savedAt: '2026-07-19T00:00:00Z',
        savedPrice: null,
        currentPrice: null,
        sourceKind: null,
        eventStatus: 'upcoming',
        watchStatus: 'live',
        updatedAt: '2026-07-19T00:00:00Z',
        priceObservedAt: null,
        imageUrl: null,
        attendingAt: null,
      },
    ])
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: /watching/i }))
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(
      screen.queryByRole('button', { name: /turn on notifications/i }),
    ).toBeNull()
  })

  it('does not fire the sheet when master is already enabled', async () => {
    prefsData.mockReturnValue({ masterEnabled: true })
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: /watch/i }))
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(
      screen.queryByRole('button', { name: /turn on notifications/i }),
    ).toBeNull()
  })

  it('does not fire the sheet when the user has previously dismissed the ask', async () => {
    markPostWatchAskDismissed()
    expect(hasDismissedPostWatchAsk()).toBe(true)
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: /watch/i }))
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(
      screen.queryByRole('button', { name: /turn on notifications/i }),
    ).toBeNull()
  })

  it('cancels the pending sheet when the component unmounts within the 500ms delay', async () => {
    // Cleanup path: if the user navigates away / the component unmounts
    // before the 500ms trigger, the pending setTimeout must be cleared so
    // it never fires on a dead component (React would warn about state
    // updates on unmounted components in dev + the sheet would open
    // detached from the tree in prod).
    const { unmount } = renderButton()
    fireEvent.click(screen.getByRole('button', { name: /watch/i }))
    // A pending fake timer exists.
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    unmount()
    // Effect cleanup ran — the sheet-schedule timer is gone. The React
    // Query internal timer may still be present, so just assert no sheet
    // opens after we blast past the 500ms mark.
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    // Sheet must NOT open after unmount.
    expect(
      screen.queryByRole('button', { name: /turn on notifications/i }),
    ).toBeNull()
  })

  it('still fires the sheet when preferences remain undefined (unknown counts as qualifying per #1062)', async () => {
    // The issue explicitly says masterEnabled `unknown/false` both qualify —
    // bailing on undefined would silently swallow the ask for anyone on a
    // slow connection. subscribeToPush is idempotent on the server, so an
    // over-ask on a fresh device that turned out to have master=true
    // elsewhere is a mild UX cost, not a correctness bug.
    prefsData.mockReturnValue(undefined)
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: /watch/i }))
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(
      screen.getByRole('button', { name: /turn on notifications/i }),
    ).not.toBeNull()
  })

  it('bails at fire time when preferences resolve to masterEnabled=true during the 500ms window', async () => {
    // Race the fix targets: gate sees undefined at scheduling; the query
    // resolves with true before the 500ms fires. The ref reads the latest
    // value and bails so an already-opted-in user doesn't get re-asked.
    prefsData.mockReturnValue(undefined)
    const { rerender } = render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <WatchShowButton eventId="evt_1" initialWatching={false} />
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /watch/i }))
    // Query resolves late.
    prefsData.mockReturnValue({ masterEnabled: true })
    rerender(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <WatchShowButton eventId="evt_1" initialWatching={false} />
      </QueryClientProvider>,
    )
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    // Sheet must NOT open — the ref sees the late master=true and bails.
    expect(
      screen.queryByRole('button', { name: /turn on notifications/i }),
    ).toBeNull()
  })

  it('does not fire the sheet on browsers where push is unsupported', async () => {
    // A non-iOS browser without the Push API would see a Turn On CTA that
    // could never succeed — silent bail is the honest option.
    pushSupportMock.mockReturnValue('unsupported')
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: /watch/i }))
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(
      screen.queryByRole('button', { name: /turn on notifications/i }),
    ).toBeNull()
    expect(screen.queryByRole('button', { name: /show me how/i })).toBeNull()
  })

  it('shows the iOS variant on Safari outside standalone mode', async () => {
    pushSupportMock.mockReturnValue('ios-needs-install')
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: /watch/i }))
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByRole('button', { name: /show me how/i })).not.toBeNull()
    // The default "Turn on" CTA must not appear on the iOS variant.
    expect(
      screen.queryByRole('button', { name: /turn on notifications/i }),
    ).toBeNull()
  })

  it('records a dismissal when Not now is clicked', async () => {
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: /watch/i }))
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByRole('button', { name: /not now/i })).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /not now/i }))
    expect(hasDismissedPostWatchAsk()).toBe(true)
  })

  it('calls subscribeToPush AND PATCHes masterEnabled=true when Turn on is clicked (#1130 fix)', async () => {
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: /watch/i }))
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(
      screen.getByRole('button', { name: /turn on notifications/i }),
    ).not.toBeNull()
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /turn on notifications/i }),
      )
    })
    // The onTurnOn callback awaits getToken → subscribeToPush → PATCH.
    // Flush the microtask queue enough times for all three promise chains
    // to settle.
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(subscribeToPushMock).toHaveBeenCalled()
    // #1130 regression: without this PATCH, the server preference stays
    // false and sendPushForNotification gates the push off, producing the
    // "Push notifications off" reading on Settings even though the user
    // opted in.
    expect(patchMutateAsyncMock).toHaveBeenCalledWith({ masterEnabled: true })
    expect(hasDismissedPostWatchAsk()).toBe(true)
  })

  it('rolls back the subscription when the PATCH fails after subscribe (#1130 fix)', async () => {
    // Simulate subscribe succeeds → server PATCH throws. The recovery path
    // calls unsubscribeFromPush with the subscribed row id so the user
    // isn't stranded in the half-committed state (browser subscribed,
    // server prefs off) — matches the NotificationsSection.onToggleMaster
    // rollback shape.
    patchMutateAsyncMock.mockRejectedValueOnce(new Error('server down'))
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: /watch/i }))
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /turn on notifications/i }),
      )
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(unsubscribeFromPushMock).toHaveBeenCalledWith(
      'test-token',
      'sub-row-1',
    )
  })
})

describe('WatchShowButton — signed-out gating beat (#794)', () => {
  const renderWith = (artist?: string) => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    return render(
      <QueryClientProvider client={client}>
        <WatchShowButton
          eventId="evt_1"
          initialWatching={false}
          artist={artist}
        />
      </QueryClientProvider>,
    )
  }

  const theButton = () => screen.getByRole('button', { name: /watch/i })

  // The picker is loaded with next/dynamic, so its chunk resolves a microtask
  // after the tap rather than in the same commit.
  const tapAndSettle = async () => {
    await act(async () => {
      fireEvent.click(theButton())
    })
    await act(async () => {
      await Promise.resolve()
    })
  }

  it('opens the tier picker instead of silently doing nothing', async () => {
    signedIn = false
    renderWith('Geese')
    expect(screen.queryByTestId('tier-picker')).toBeNull()
    await tapAndSettle()
    expect(screen.getByTestId('tier-picker')).not.toBeNull()
    // No watch mutation may be attempted without a session.
    expect(toggleMutate).not.toHaveBeenCalled()
  })

  it('does not load the picker chunk until the eye is tapped', () => {
    // The static import this replaced put @stripe/stripe-js into the bundle of
    // every page that renders a card, including /watching.
    signedIn = false
    renderWith('Geese')
    expect(screen.queryByTestId('tier-picker')).toBeNull()
  })

  it('tags the picker with the logged-out-watch funnel entry', async () => {
    signedIn = false
    renderWith('Geese')
    await tapAndSettle()
    expect(screen.getByTestId('tier-picker').getAttribute('data-entry')).toBe(
      'logged-out-watch',
    )
  })

  it('names the artist in the signed-out accessible name', () => {
    signedIn = false
    renderWith('Geese')
    expect(theButton().getAttribute('aria-label')).toBe(
      'Watch Geese — sign up to start watching',
    )
  })

  it.each([
    ['undefined', undefined],
    ['empty string', ''],
  ])('falls back to "this show" when the artist is %s', (_label, artist) => {
    signedIn = false
    renderWith(artist)
    // Guards against the doubled space a default parameter would leave.
    expect(theButton().getAttribute('aria-label')).toBe(
      'Watch this show — sign up to start watching',
    )
  })

  it('omits aria-pressed signed out — the eye is a dialog trigger, not a toggle', () => {
    signedIn = false
    renderWith('Geese')
    // Omitted entirely, not "false": aria-pressed="false" would announce an
    // off switch for a control that never had an on state.
    expect(theButton().hasAttribute('aria-pressed')).toBe(false)
  })

  it('advertises the dialog it opens', async () => {
    signedIn = false
    renderWith('Geese')
    expect(theButton().getAttribute('aria-haspopup')).toBe('dialog')
    expect(theButton().getAttribute('aria-expanded')).toBe('false')
    await tapAndSettle()
    expect(theButton().getAttribute('aria-expanded')).toBe('true')
  })

  it('keeps the signed-in toggle semantics untouched', () => {
    signedIn = true
    renderWith('Geese')
    expect(theButton().getAttribute('aria-pressed')).toBe('false')
    expect(theButton().hasAttribute('aria-haspopup')).toBe(false)
    expect(theButton().getAttribute('aria-label')).toBe(
      CONSUMER_COPY.watchShowButton.button.ariaWatch,
    )
  })

  it('ignores a watching cache left behind by a signed-out user', () => {
    // useWatching is `enabled: !!isSignedIn`, which stops refetching but does
    // not evict — React Query keeps the previous user's rows for the rest of the
    // SPA session. Rendering them would leak per-user state across sign-out.
    signedIn = false
    watchingData.mockReturnValue([
      {
        userEventId: 'ue_1',
        eventId: 'evt_1',
        artist: 'A',
        venueName: 'V',
        venueSlug: 'v',
        date: '2026-08-14',
        showTime: null,
        ticketUrl: null,
        ticketLinks: null,
        savedAt: '2026-07-19T00:00:00Z',
        savedPrice: null,
        currentPrice: null,
        sourceKind: null,
        eventStatus: 'upcoming',
        watchStatus: 'live',
        updatedAt: '2026-07-19T00:00:00Z',
        priceObservedAt: null,
        imageUrl: null,
        attendingAt: null,
      },
    ])
    renderWith('Geese')
    // The eye is the whole gesture at every breakpoint — a visible label would
    // make it a mobile shorthand rather than the affordance itself.
    expect(theButton().textContent).toBe('')
    expect(theButton().hasAttribute('aria-pressed')).toBe(false)
    expect(theButton().getAttribute('aria-label')).toBe(
      'Watch Geese — sign up to start watching',
    )
  })

  it('renders pixel-identically to signed-in-at-rest', () => {
    // The gate is announced, never drawn: no dimming, no lock glyph, no
    // changed label. Stripping the aria attributes should leave two identical
    // buttons — if a future change dims the signed-out eye, this fails.
    const stripAria = (html: string) =>
      html.replace(/\saria-[a-z]+="[^"]*"/g, '')

    signedIn = false
    renderWith('Geese')
    const out = stripAria(theButton().outerHTML)
    cleanup()

    signedIn = true
    renderWith('Geese')
    expect(out).toBe(stripAria(theButton().outerHTML))
  })
})
