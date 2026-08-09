// @vitest-environment jsdom

import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EntitlementResult } from '@/lib/queries/use-entitlement'
import type { ShelfArtist } from './definitions/types'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

const authState: { isSignedIn: boolean | undefined } = { isSignedIn: true }
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => authState,
}))

const entitlementState: { current: EntitlementResult } = {
  current: { isLoading: false, active: true, surface: 'visible-active' },
}
vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => entitlementState.current,
}))

vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: undefined }),
}))

vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: ({ open, entry }: { open: boolean; entry: string }) =>
    open ? <div data-testid="tier-picker" data-entry={entry} /> : null,
}))

const toggle = vi.fn()
// Captured so a test can fire the 403 path the way the real hook does, which
// is the only way to prove it stays live while the gated tap is failing closed.
let onEntitlementRequired: (() => void) | undefined
vi.mock('@/components/consumer/artist-page/lib/use-artist-follow', () => ({
  useArtistFollow: (
    _slug: string,
    initialFollowing: boolean,
    onNeedsEntitlement?: () => void,
  ) => {
    onEntitlementRequired = onNeedsEntitlement
    return { following: initialFollowing, toggle }
  },
}))

import { FollowShelf } from './FollowShelf'
import { FOLLOWING_COPY } from './definitions/copy'

const artist = (overrides: Partial<ShelfArtist> = {}): ShelfArtist => ({
  key: 'k1',
  name: 'Ratbag',
  slug: 'ratbag',
  photoUrl: null,
  dateLine: 'Larimer Lounge · Sep 12',
  following: false,
  ...overrides,
})

const renderShelf = (
  overrides: Partial<React.ComponentProps<typeof FollowShelf>> = {},
) =>
  render(
    <FollowShelf
      mode="zero"
      artists={[artist()]}
      followCount={0}
      scaRegion={false}
      {...overrides}
    />,
  )

describe('FollowShelf', () => {
  beforeEach(() => {
    authState.isSignedIn = true
    entitlementState.current = {
      isLoading: false,
      active: true,
      surface: 'visible-active',
    }
    toggle.mockClear()
  })

  it('renders nothing when there are no rows to show', () => {
    const { container } = renderShelf({ artists: [] })
    expect(container.innerHTML).toBe('')
  })

  // The starter shelf recruits. No dismiss affordance, no apology.
  it('zero: renders the starter head and the browse-all action', () => {
    renderShelf()
    expect(screen.getByText(FOLLOWING_COPY.starterEyebrow)).toBeTruthy()
    expect(screen.getByText(FOLLOWING_COPY.starterTitle)).toBeTruthy()
    expect(screen.getByText(FOLLOWING_COPY.starterBody)).toBeTruthy()
    expect(screen.getByText(FOLLOWING_COPY.starterAction)).toBeTruthy()
  })

  it('some: names the follow count and links to the scoped list', () => {
    renderShelf({ mode: 'some', followCount: 4, artists: [artist()] })
    expect(screen.getByText(FOLLOWING_COPY.yoursEyebrow(4))).toBeTruthy()
    expect(screen.getByText(FOLLOWING_COPY.yoursTitle)).toBeTruthy()
    const action = screen.getByText(FOLLOWING_COPY.yoursAction)
    expect(action.closest('a')?.getAttribute('href')).toBe(
      '/events?filterFollowing=1',
    )
    expect(screen.queryByText(FOLLOWING_COPY.starterAction)).toBeNull()
  })

  // Spotify is a SOURCE, not a second information architecture: the eyebrow is
  // the only thing that differs from `some`.
  it('spotify: differs from some only in the eyebrow', () => {
    renderShelf({ mode: 'spotify', followCount: 4, artists: [artist()] })
    expect(screen.getByText(FOLLOWING_COPY.spotifyEyebrow(4))).toBeTruthy()
    expect(screen.getByText(FOLLOWING_COPY.yoursTitle)).toBeTruthy()
  })

  it('caps the starter shelf at the visible-card count', () => {
    const many = Array.from({ length: 18 }, (_, i) =>
      artist({ key: `k${i}`, name: `Act ${i}`, slug: `act-${i}` }),
    )
    renderShelf({ artists: many })
    expect(screen.getAllByRole('listitem').length).toBe(6)
  })

  it('does not cap or shuffle your own artists', () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      artist({ key: `k${i}`, name: `Act ${i}`, slug: `act-${i}` }),
    )
    renderShelf({ mode: 'some', followCount: 9, artists: many })
    const names = screen
      .getAllByRole('link')
      .map((node) => node.textContent)
      .filter((text) => text?.startsWith('Act'))
    expect(names).toEqual(many.map((row) => row.name))
  })

  it('locked viewers get a gated badge that opens the picker', () => {
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    }
    renderShelf()
    const badge = screen.getByRole('button', {
      name: FOLLOWING_COPY.followAria('Ratbag'),
    })
    expect(badge.getAttribute('aria-pressed')).toBeNull()
    fireEvent.click(badge)
    expect(toggle).not.toHaveBeenCalled()
    expect(screen.getByTestId('tier-picker').getAttribute('data-entry')).toBe(
      'paywall',
    )
  })

  // A downgraded viewer keeps their follows and DELETE stays ungated, so the
  // badge on their own artists must still toggle rather than open the paywall.
  it('a downgraded viewer can still unfollow from the some shelf', () => {
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    }
    renderShelf({
      mode: 'some',
      followCount: 1,
      artists: [artist({ following: true })],
    })
    const badge = screen.getByRole('button', {
      name: FOLLOWING_COPY.followingAria('Ratbag'),
    })
    fireEvent.click(badge)
    expect(toggle).toHaveBeenCalled()
    expect(screen.queryByTestId('tier-picker')).toBeNull()
  })

  it('signed-out viewers hand off to the logged-out picker entry', () => {
    authState.isSignedIn = false
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'tier-picker-on-tap',
    }
    renderShelf()
    fireEvent.click(
      screen.getByRole('button', {
        name: FOLLOWING_COPY.followAria('Ratbag'),
      }),
    )
    expect(screen.getByTestId('tier-picker').getAttribute('data-entry')).toBe(
      'logged-out-follow',
    )
  })

  // Clerk and the entitlement resolve after mount. A tap in that window must
  // not reach `toggle`: with no token yet it dies on "Not authenticated",
  // which is not an ApiError and so never reaches the 403 → picker handoff.
  it('the starter shelf fails closed while auth and entitlement resolve', () => {
    authState.isSignedIn = undefined
    entitlementState.current = { isLoading: true, active: false, surface: null }
    renderShelf()
    fireEvent.click(
      screen.getByRole('button', {
        name: FOLLOWING_COPY.followAria('Ratbag'),
      }),
    )
    expect(toggle).not.toHaveBeenCalled()
    // Nor the paywall: `pickerEntry` reads the surface, so an early sheet
    // would show an entitled viewer the wrong pitch.
    expect(screen.queryByTestId('tier-picker')).toBeNull()
  })

  // The gated tap can decline while the plan resolves; a 403 cannot. It is the
  // server's settled answer, so it opens the sheet whatever the client knows.
  it('a 403 opens the picker even while the entitlement is unresolved', () => {
    authState.isSignedIn = undefined
    entitlementState.current = { isLoading: true, active: false, surface: null }
    renderShelf()
    act(() => onEntitlementRequired?.())
    expect(screen.getByTestId('tier-picker')).toBeTruthy()
  })

  it('entitled viewers toggle the follow directly', () => {
    renderShelf()
    fireEvent.click(
      screen.getByRole('button', {
        name: FOLLOWING_COPY.followAria('Ratbag'),
      }),
    )
    expect(toggle).toHaveBeenCalled()
  })
})

describe('ShelfCard rows', () => {
  beforeEach(() => {
    authState.isSignedIn = true
    entitlementState.current = {
      isLoading: false,
      active: true,
      surface: 'visible-active',
    }
  })

  // A Spotify follow for an act never billed in Denver has no projection row,
  // so no page and no follow endpoint. That is a NORMAL row, not an error.
  it('a slug-less row renders unlinked and carries no follow badge', () => {
    renderShelf({
      mode: 'some',
      followCount: 1,
      artists: [artist({ slug: null, name: 'Ghost Act', following: true })],
    })
    expect(screen.getByText('Ghost Act')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Ghost Act' })).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('falls back to the no-date line when nothing is on the books', () => {
    renderShelf({
      mode: 'some',
      followCount: 1,
      artists: [artist({ dateLine: null })],
    })
    expect(screen.getByText(FOLLOWING_COPY.cardNoDate)).toBeTruthy()
  })

  it('an already-followed row reads as following', () => {
    renderShelf({
      mode: 'some',
      followCount: 1,
      artists: [artist({ following: true })],
    })
    const badge = screen.getByRole('button', {
      name: FOLLOWING_COPY.followingAria('Ratbag'),
    })
    expect(badge.getAttribute('aria-pressed')).toBe('true')
  })
})
