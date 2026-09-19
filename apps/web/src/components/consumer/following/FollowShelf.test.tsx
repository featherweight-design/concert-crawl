// @vitest-environment jsdom

import { render, screen, fireEvent, act, within } from '@testing-library/react'
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

import { IdentityArt } from '@/components/consumer/identity-art/IdentityArt'
import { FollowShelf } from './FollowShelf'
import { FOLLOWING_COPY } from './definitions/copy'
import {
  SHELF_CARD_HEIGHT,
  SHELF_CARD_WIDTH,
} from '@/components/consumer/definitions/constants'

const artist = (overrides: Partial<ShelfArtist> = {}): ShelfArtist => ({
  key: 'k1',
  name: 'Ratbag',
  slug: 'ratbag',
  photoUrl: null,
  eventId: 'evt-ratbag',
  dateLine: 'Larimer Lounge · Sep 12',
  price: 32,
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

  // The follow shelf and the Spotify taste shelf compete for one slot on
  // browse, so a viewer meets them as a single component. They were 77px
  // apart: this card's art is absolutely positioned and contributed no
  // height, pinning it to the 116px floor at 202px.
  it('gives the card the shared shelf box', () => {
    renderShelf({ artists: [artist(), artist({ key: 'k2', name: 'Bugbear' })] })

    const cards = screen.getAllByTestId('shelf-card')
    expect(cards).toHaveLength(2)
    for (const card of cards) {
      expect(card.style.width).toBe(`${SHELF_CARD_WIDTH}px`)
      expect(card.style.height).toBe(`${SHELF_CARD_HEIGHT}px`)
    }
  })

  // #1525 §2 — the follow shelf is the one slot in the product that takes 3:4.
  it('pins the card art to 3:4', () => {
    renderShelf({ artists: [artist()] })

    const card = screen.getByTestId('shelf-card')
    const art = card.querySelector<HTMLElement>('a > span')
    expect(art).not.toBeNull()
    expect(art?.style.aspectRatio).toBe('3 / 4')
    expect(art?.style.width).toBe('100%')

    // The shared box is art + body, so the ratio and the height cannot drift
    // apart: 168 wide at 3:4 is 224, and the card is that plus its body.
    expect(SHELF_CARD_HEIGHT).toBeGreaterThan((SHELF_CARD_WIDTH * 4) / 3)
  })

  // The scale has to be passed, not derived: `size="100%"` cannot tell `Panel`
  // that this slot renders at 224px, so left alone it would fall to `tile` and
  // draw a 224px card at tile density.
  it('asks for hero-scale detail rather than letting the size derive it', () => {
    const name = 'Neal Francis'
    renderShelf({ artists: [artist({ name })] })

    const drawn = screen
      .getByTestId('shelf-card')
      .querySelector('a > span > div')?.innerHTML

    const at = (scale: 'hero' | 'tile') =>
      render(<IdentityArt name={name} kind="artist" scale={scale} />).container
        .firstElementChild?.innerHTML

    expect(drawn).toBeTruthy()
    expect(drawn).toBe(at('hero'))
    // Not merely equal to hero by coincidence: the two scales differ, so this
    // fails the moment the prop stops being passed.
    expect(drawn).not.toBe(at('tile'))
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

  // The head carries the count and nothing else: a "see them all" link beside
  // it went the same way as the per-card check, because the My artists browse
  // chip is already that filter.
  it('some: names the follow count and offers no second filter', () => {
    renderShelf({ mode: 'some', followCount: 4, artists: [artist()] })
    expect(screen.getByText(FOLLOWING_COPY.yoursEyebrow(4))).toBeTruthy()
    expect(screen.getByText(FOLLOWING_COPY.yoursTitle)).toBeTruthy()
    expect(screen.queryByText(FOLLOWING_COPY.starterAction)).toBeNull()
    const hrefs = screen
      .getAllByRole('link')
      .map((node) => node.getAttribute('href'))
    // One link, and it is the card's — the card opens the show it is
    // advertising, not the artist's page.
    expect(hrefs).toEqual(['/events/evt-ratbag'])
  })

  it('caps the starter shelf at the visible-card count', () => {
    const many = Array.from({ length: 24 }, (_, i) =>
      artist({ key: `k${i}`, name: `Act ${i}`, slug: `act-${i}` }),
    )
    renderShelf({ artists: many })
    expect(screen.getAllByRole('listitem').length).toBe(10)
  })

  // The cap is the shelf's, not the starter shelf's: one row of cards is what
  // fits, whichever mode filled it.
  it('caps your own artists at the same count', () => {
    const many = Array.from({ length: 14 }, (_, i) =>
      artist({ key: `k${i}`, name: `Act ${i}`, slug: `act-${i}` }),
    )
    renderShelf({ mode: 'some', followCount: 14, artists: many })
    expect(screen.getAllByRole('listitem').length).toBe(10)
  })

  it('does not shuffle your own artists', () => {
    const many = Array.from({ length: 4 }, (_, i) =>
      artist({ key: `k${i}`, name: `Act ${i}`, slug: `act-${i}` }),
    )
    renderShelf({ mode: 'some', followCount: 4, artists: many })
    // A card reads name + date + price, so compare on the prefix: this test is
    // about row ORDER, not about what each row says.
    const rows = screen.getAllByRole('listitem').map((node) => node.textContent)
    expect(rows).toHaveLength(many.length)
    rows.forEach((text, index) => {
      expect(text?.startsWith(`Act ${index}`)).toBe(true)
    })
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

  // Every row under "Your artists" is followed by definition, so a badge there
  // could only restate the heading. Unfollowing lives on My shows ▸ Artists and
  // the artist page, both of which stay reachable from the card.
  it('draws no follow badge on your own artists', () => {
    renderShelf({
      mode: 'some',
      followCount: 1,
      artists: [artist({ following: true })],
    })
    expect(screen.queryByRole('button')).toBeNull()
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

  // A Spotify follow for an act with no projection row has no page and no
  // follow endpoint. That is a NORMAL row, not an error.
  //
  // It can still have a show: the API derives `nextShow` by matching canonical
  // names against `events`, which never consults the projection the slug comes
  // from. A hidden projection row produces exactly this pair. So the row is
  // linkable even though it is unfollowable, and the event is what it links to.
  it('a slug-less row still opens its show, and carries no follow badge', () => {
    renderShelf({
      artists: [artist({ slug: null, name: 'Ghost Act', following: true })],
    })
    expect(screen.getByText('Ghost Act')).toBeTruthy()
    // Scoped to the row: the starter shelf's own "find artists" action is a
    // link too, and it is not what this test is about.
    const row = screen.getByRole('listitem')
    expect(within(row).getByRole('link').getAttribute('href')).toBe(
      '/events/evt-ratbag',
    )
    expect(within(row).queryByRole('button')).toBeNull()
  })

  // The only genuinely inert row: nothing to follow and nothing on the books.
  it('a slug-less row with no show renders unlinked', () => {
    renderShelf({
      artists: [
        artist({
          slug: null,
          eventId: null,
          dateLine: null,
          name: 'Ghost Act',
          following: true,
        }),
      ],
    })
    const row = screen.getByRole('listitem')
    expect(within(row).queryByRole('link')).toBeNull()
    expect(within(row).queryByRole('button')).toBeNull()
  })

  it('falls back to the no-date line when nothing is on the books', () => {
    renderShelf({
      mode: 'some',
      followCount: 1,
      artists: [artist({ dateLine: null, eventId: null })],
    })
    expect(screen.getByText(FOLLOWING_COPY.cardNoDate)).toBeTruthy()
  })

  // The card carries the same three rows as the Spotify taste card beside it,
  // price included — the two share one browse slot.
  it('renders the price, and says tba when there is none', () => {
    renderShelf({ mode: 'some', followCount: 2, artists: [artist()] })
    expect(screen.getByText('$32')).toBeTruthy()

    renderShelf({
      mode: 'some',
      followCount: 2,
      artists: [artist({ price: null })],
    })
    expect(screen.getAllByText(FOLLOWING_COPY.cardPriceTba).length).toBe(1)
  })

  // The starter shelf keeps its badge: there it is the only way to follow
  // anyone, and the check is the acknowledgement of a follow just made.
  it('a followed starter row reads as following', () => {
    renderShelf({ artists: [artist({ following: true })] })
    const badge = screen.getByRole('button', {
      name: FOLLOWING_COPY.followingAria('Ratbag'),
    })
    expect(badge.getAttribute('aria-pressed')).toBe('true')
  })
})
