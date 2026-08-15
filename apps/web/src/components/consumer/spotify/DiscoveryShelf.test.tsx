// @vitest-environment jsdom

import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type {
  SpotifyTastePick,
  SpotifyTastePicksResponse,
} from '@concert-crawl/types'

interface EntitlementState {
  isLoading: boolean
  active: boolean
  surface: string | null
}

interface PicksQueryState {
  data: SpotifyTastePicksResponse | undefined
  isPending: boolean
  isError: boolean
}

interface ConnectionState {
  data:
    { status: 'connected' | 'disconnected' | 'error' | 'revoked' } | undefined
}

let entitlement: EntitlementState
let picksQuery: PicksQueryState
let connection: ConnectionState
let authUserId: string | null = 'user_viewer'
let picksEnabledArg: boolean | undefined
let picksInitialDataArg: SpotifyTastePicksResponse | undefined
const picksRefetch = vi.fn()

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ userId: authUserId }),
}))

vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => entitlement,
}))

vi.mock('@/lib/queries/use-spotify-connection', () => ({
  useSpotifyConnection: () => connection,
}))

vi.mock('@/lib/queries/use-taste-picks', () => ({
  useTastePicks: (
    enabled: boolean,
    initialData?: SpotifyTastePicksResponse,
  ) => {
    picksEnabledArg = enabled
    picksInitialDataArg = initialData
    // Approximates the seeded-query happy path only (seed resolves
    // immediately). The hook's userId gate on applying initialData is
    // covered directly in use-taste-picks.test.tsx.
    if (picksQuery.data === undefined && initialData !== undefined) {
      return {
        data: initialData,
        isPending: false,
        isError: false,
        refetch: picksRefetch,
      }
    }
    return { ...picksQuery, refetch: picksRefetch }
  },
}))

vi.mock('./OAuthHandoffSheet', () => ({
  OAuthHandoffSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="handoff-sheet" /> : null,
}))

import { DiscoveryShelf } from './DiscoveryShelf'
import { SPOTIFY_COPY } from './definitions/copy'
import { SHELF_HINT_COOKIE } from '@/lib/shelf-hint'
import {
  SHELF_CARD_HEIGHT,
  SHELF_CARD_WIDTH,
} from '@/components/consumer/definitions/constants'

const COPY = SPOTIFY_COPY.discovery

const pick = (overrides: Partial<SpotifyTastePick> = {}): SpotifyTastePick => ({
  eventId: 'evt-1',
  artist: 'Turnstile',
  title: 'Turnstile',
  imageUrl: null,
  artistPhotoUrl: null,
  date: '2030-08-02',
  showTime: '20:00:00',
  ticketPriceMin: '39.00',
  venueName: 'Mission Ballroom',
  venueSlug: 'mission-ballroom',
  reason: { kind: 'top', rank: 4, artistName: 'Turnstile' },
  ...overrides,
})

const connected = (picks: SpotifyTastePick[]): SpotifyTastePicksResponse => ({
  status: 'connected',
  picks,
})

beforeEach(() => {
  entitlement = { isLoading: false, active: true, surface: 'visible-active' }
  picksQuery = {
    data: connected([pick()]),
    isPending: false,
    isError: false,
  }
  // Connection defaults to connected — the shelf's happy path assumes it.
  // Individual tests override to disconnected/undefined where needed.
  connection = { data: { status: 'connected' } }
  picksEnabledArg = undefined
  picksInitialDataArg = undefined
  picksRefetch.mockReset()
})

describe('DiscoveryShelf', () => {
  it('renders nothing while the entitlement is resolving with no seeded data', () => {
    entitlement = { isLoading: true, active: false, surface: null }
    // Query is disabled (entitlement not yet active) and has no SSR seed.
    picksQuery = { data: undefined, isPending: true, isError: false }
    const { container } = render(<DiscoveryShelf />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing (hidden-style, no locked preview) when not entitled', () => {
    entitlement = { isLoading: false, active: false, surface: 'hidden' }
    const { container } = render(<DiscoveryShelf />)
    expect(container.innerHTML).toBe('')
    // The gated endpoint is never queried for non-entitled viewers.
    expect(picksEnabledArg).toBe(false)
  })

  it('renders nothing while the query is pending, on error, or disconnected', () => {
    // Loading branch is gated on a known-connected user, so hold connection
    // resolution open here to keep the pending case in the hidden-style path.
    connection = { data: undefined }
    picksQuery = { data: undefined, isPending: true, isError: false }
    const { container, rerender } = render(<DiscoveryShelf />)
    expect(container.innerHTML).toBe('')

    picksQuery = { data: undefined, isPending: false, isError: true }
    rerender(<DiscoveryShelf />)
    expect(container.innerHTML).toBe('')

    picksQuery = {
      data: { status: 'disconnected', picks: [] },
      isPending: false,
      isError: false,
    }
    rerender(<DiscoveryShelf />)
    expect(container.innerHTML).toBe('')
  })

  it('renders the loading shelf when entitled + connected + picks pending (SSR seed absent)', () => {
    // Cold hydration / mid-session upgrade — no seed, no cached data yet.
    connection = { data: { status: 'connected' } }
    picksQuery = { data: undefined, isPending: true, isError: false }
    render(<DiscoveryShelf />)

    // role=status + aria-live=polite makes assistive tech announce the
    // "loading picks…" region.
    expect(
      screen.getByRole('status', { name: COPY.loading.ariaLabel }),
    ).toBeTruthy()
    expect(screen.getByText(COPY.title)).toBeTruthy()
    expect(screen.getByText(COPY.loading.eyebrow)).toBeTruthy()
  })

  it('stays hidden while picks are pending when the connection query has not resolved', () => {
    // Without a positive "connected" signal we must NEVER flash the shelf —
    // that's the whole point of the triple-gate. A pending connection query
    // (data undefined) should render nothing, not the loading state.
    connection = { data: undefined }
    picksQuery = { data: undefined, isPending: true, isError: false }
    const { container } = render(<DiscoveryShelf />)
    expect(container.innerHTML).toBe('')
  })

  it('stays hidden while picks are pending when connection is disconnected', () => {
    // Disconnected users must never see the loading state either — the
    // shelf entirely does not apply to them (hidden-style, spec §7).
    connection = { data: { status: 'disconnected' } }
    picksQuery = { data: undefined, isPending: true, isError: false }
    const { container } = render(<DiscoveryShelf />)
    expect(container.innerHTML).toBe('')
  })

  it('hides the shelf when connection is disconnected even if picks are cached', () => {
    // Regression: useTastePicks has a 5-min staleTime, so a disconnect
    // doesn't clear cached "connected" picks. Without the connection
    // override, the shelf would render stale picks for up to 5 minutes
    // after the user disconnected. `disconnected` is hidden-style per §7.
    connection = { data: { status: 'disconnected' } }
    picksQuery = {
      data: connected([pick()]),
      isPending: false,
      isError: false,
    }
    const { container } = render(<DiscoveryShelf />)
    expect(container.innerHTML).toBe('')
  })

  it('stays hidden when entitlement is still loading + connection is error, even without SSR seed', () => {
    // Non-entitled users must never see the failure shelf — they'd be
    // shown a paid-feature UI they aren't entitled to. While entitlement
    // is loading, only SSR-seeded picks (which proved entitlement
    // server-side) unlock the connection-driven failure rendering.
    entitlement = { isLoading: true, active: false, surface: null }
    connection = { data: { status: 'error' } }
    picksQuery = { data: undefined, isPending: true, isError: false }
    const { container } = render(<DiscoveryShelf />)
    expect(container.innerHTML).toBe('')
  })

  it.each(['error', 'revoked'] as const)(
    'renders the failure shelf immediately when connection is %s (does not wait for picks refetch)',
    (status) => {
      // Even when picks are cached as connected, an error/revoked
      // connection should paint the "taste on pause" reconnect state
      // right away — matching the picks-response-driven failure UI.
      connection = { data: { status } }
      picksQuery = {
        data: connected([pick()]),
        isPending: false,
        isError: false,
      }
      render(<DiscoveryShelf />)
      expect(screen.getByRole('region', { name: COPY.title })).toBeTruthy()
      expect(screen.getByText(COPY.failure.eyebrow)).toBeTruthy()
      expect(screen.getByText(COPY.failure.title)).toBeTruthy()
      expect(
        screen.getByRole('button', { name: COPY.failure.primaryCta }),
      ).toBeTruthy()
    },
  )

  it('renders the shelf with header, eyebrow, and pick cards', () => {
    picksQuery.data = connected([
      pick(),
      pick({
        eventId: 'evt-2',
        artist: 'Big Head Todd',
        venueName: 'Red Rocks Amphitheatre',
        date: '2030-08-09',
        ticketPriceMin: '55.00',
        reason: { kind: 'followed', artistName: 'Big Head Todd' },
      }),
    ])
    render(<DiscoveryShelf />)

    expect(screen.getByRole('region', { name: COPY.title })).toBeTruthy()
    expect(screen.getByText(COPY.title)).toBeTruthy()
    expect(screen.getByText(COPY.eyebrow(2))).toBeTruthy()
    expect(screen.getByRole('list', { name: COPY.listAria })).toBeTruthy()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)

    // Card content: artist, venue · short date, price (mock shows the full
    // venue name — "Mission Ballroom", not the shortened form).
    expect(screen.getByText('Turnstile')).toBeTruthy()
    expect(screen.getByText('Big Head Todd')).toBeTruthy()
    expect(items[0]?.textContent).toContain('Mission Ballroom')
    expect(items[0]?.textContent).toContain('Aug 2')
    expect(items[1]?.textContent).toContain('Red Rocks Amphitheatre')
    expect(items[1]?.textContent).toContain('Aug 9')
    expect(screen.getByText('$39')).toBeTruthy()
    expect(screen.getByText('$55')).toBeTruthy()

    // Cards link to their event detail pages.
    const links = screen.getAllByRole('link')
    expect(
      links.some((el) => el.getAttribute('href') === '/events/evt-1'),
    ).toBe(true)

    // Hand-off divider into the main list.
    expect(screen.getByText(COPY.allShowsDivider)).toBeTruthy()
  })

  it('grows the image region to absorb extra card height, keeping the info block natural-height', () => {
    // Regression (#763 staging r4): a fixed-height image + flex-1 content
    // squeezed fallback-graphic cards to zero text (IdentityArt's inline
    // height:100% beats a height class) and stretched the text region on
    // image cards. The image region flexes; the content block does not.
    picksQuery.data = connected([
      pick(), // imageUrl: null → IdentityArt fallback
      pick({ eventId: 'evt-img', artist: 'Alvvays', imageUrl: 'https://img' }),
    ])
    render(<DiscoveryShelf />)

    // Scope to the shelf list so unrelated links (divider, CTAs) can't
    // dilute the card-structure assertions.
    const list = screen.getByRole('list', { name: COPY.listAria })
    for (const link of within(list).getAllByRole('link')) {
      const imageRegion = link.firstElementChild
      const content = link.lastElementChild
      expect(imageRegion?.className).toContain('flex-1')
      expect(imageRegion?.className).toContain('min-h-[116px]')
      expect(imageRegion?.className).not.toContain('shrink-0')
      expect(content?.className).toContain('shrink-0')
      expect(content?.className).not.toContain('flex-1')
    }
    // Fallback-graphic card still surfaces its show info.
    expect(screen.getByText('Turnstile')).toBeTruthy()
  })

  it('gives every card the shared shelf box, whatever its image', () => {
    // Regression: the card had no declared height, so `flex-1` art resolved
    // against content and the inner <img>'s `h-full` fell back to auto. One
    // portrait poster in the row therefore sized every card in it (measured:
    // 362px for a 400x600 source, 279px for a square one), and the follow
    // shelf sharing this slot sat at 202px. The box is declared now, so no
    // source asset can move it.
    picksQuery.data = connected([
      pick(),
      pick({ eventId: 'evt-img', artist: 'Alvvays', imageUrl: 'https://img' }),
    ])
    render(<DiscoveryShelf />)

    const cards = screen.getAllByTestId('taste-pick-card')
    expect(cards).toHaveLength(2)
    for (const card of cards) {
      expect(card.style.width).toBe(`${SHELF_CARD_WIDTH}px`)
      expect(card.style.height).toBe(`${SHELF_CARD_HEIGHT}px`)
    }
  })

  it('renders immediately from initialPicks while client entitlement/query are still resolving', () => {
    entitlement = { isLoading: true, active: false, surface: null }
    picksQuery = { data: undefined, isPending: true, isError: false }
    render(<DiscoveryShelf initialPicks={connected([pick()])} />)

    expect(picksInitialDataArg).toEqual(connected([pick()]))
    expect(screen.getByRole('region', { name: COPY.title })).toBeTruthy()
    expect(screen.getByText('Turnstile')).toBeTruthy()
  })

  it('stays hidden when initialPicks reports disconnected', () => {
    entitlement = { isLoading: true, active: false, surface: null }
    picksQuery = { data: undefined, isPending: true, isError: false }
    const { container } = render(
      <DiscoveryShelf initialPicks={{ status: 'disconnected', picks: [] }} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('uses the singular eyebrow for one pick', () => {
    picksQuery.data = connected([pick()])
    render(<DiscoveryShelf />)
    expect(screen.getByText(COPY.eyebrowSingular)).toBeTruthy()
  })

  it('maps reasons to chip labels, including the rank-5 boundary', () => {
    picksQuery.data = connected([
      pick({
        eventId: 'evt-top5',
        reason: { kind: 'top', rank: 5, artistName: 'Turnstile' },
      }),
      pick({
        eventId: 'evt-top6',
        artist: 'Alvvays',
        reason: { kind: 'top', rank: 6, artistName: 'Alvvays' },
      }),
      pick({
        eventId: 'evt-followed',
        artist: 'Fontaines D.C.',
        reason: { kind: 'followed', artistName: 'Fontaines D.C.' },
      }),
    ])
    render(<DiscoveryShelf />)
    expect(screen.getByText(COPY.reasonTopFive)).toBeTruthy()
    expect(screen.getByText(COPY.reasonTop)).toBeTruthy()
    expect(screen.getByText(COPY.reasonFollowed)).toBeTruthy()
  })

  it('falls back to tba when the pick has no price', () => {
    picksQuery.data = connected([pick({ ticketPriceMin: null })])
    render(<DiscoveryShelf />)
    expect(screen.getByText(COPY.priceTba)).toBeTruthy()
  })

  it('renders the quiet-month empty state when connected with zero picks', () => {
    picksQuery.data = connected([])
    render(<DiscoveryShelf />)
    expect(screen.getByText(COPY.empty.eyebrow)).toBeTruthy()
    expect(screen.getByText(COPY.empty.title)).toBeTruthy()
    expect(screen.getByText(COPY.empty.body)).toBeTruthy()
    const cta = screen.getByRole('link', { name: COPY.empty.cta })
    expect(cta.getAttribute('href')).toBe('/events')
    // No divider — the empty state hands off with its own CTA.
    expect(screen.queryByText(COPY.allShowsDivider)).toBeNull()
  })

  it.each(['error', 'revoked'] as const)(
    'renders taste-on-pause for status %s with a working Reconnect',
    (status) => {
      picksQuery.data = { status, picks: [] }
      render(<DiscoveryShelf />)
      expect(screen.getByText(COPY.failure.eyebrow)).toBeTruthy()
      expect(screen.getByText(COPY.failure.title)).toBeTruthy()
      expect(screen.getByText(COPY.failure.body)).toBeTruthy()
      expect(
        screen
          .getByRole('link', { name: COPY.failure.secondaryCta })
          .getAttribute('href'),
      ).toBe('/events')

      expect(screen.queryByTestId('handoff-sheet')).toBeNull()
      fireEvent.click(
        screen.getByRole('button', { name: COPY.failure.primaryCta }),
      )
      expect(screen.getByTestId('handoff-sheet')).toBeTruthy()
    },
  )

  // #1525 — a taste pick is an event surface, so its card resolves the
  // event's artwork, then the headliner's portrait, then the generated mark.
  it('shows the headliner portrait on a pick with no artwork', () => {
    const portrait = 'https://example.test/artist.jpg'
    picksQuery.data = connected([
      pick({ imageUrl: null, artistPhotoUrl: portrait }),
    ])
    const { container } = render(<DiscoveryShelf />)

    expect(container.querySelector('img')?.getAttribute('src')).toBe(portrait)
  })
})

describe('DiscoveryShelf shelf-hint cookie', () => {
  const readHint = () => {
    const prefix = `${SHELF_HINT_COOKIE}=`
    return document.cookie
      .split(';')
      .map((row) => row.trim())
      .find((row) => row.startsWith(prefix))
      ?.slice(prefix.length)
  }

  beforeEach(() => {
    document.cookie = `${SHELF_HINT_COOKIE}=; path=/; max-age=0`
    authUserId = 'user_viewer'
  })

  it('records a shelf for an entitled, connected viewer', () => {
    render(<DiscoveryShelf />)
    expect(readHint()).toBe('user_viewer:1')
  })

  it('records no shelf once the entitlement resolves inactive', () => {
    entitlement = { isLoading: false, active: false, surface: 'paywall-on-tap' }
    render(<DiscoveryShelf />)
    expect(readHint()).toBe('user_viewer:0')
  })

  it('records no shelf when the viewer has disconnected Spotify', () => {
    connection = { data: { status: 'disconnected' } }
    render(<DiscoveryShelf />)
    expect(readHint()).toBe('user_viewer:0')
  })

  it('still records a shelf when the connection is broken — the failure state occupies the same slot', () => {
    connection = { data: { status: 'revoked' } }
    render(<DiscoveryShelf />)
    expect(readHint()).toBe('user_viewer:1')
  })

  it('scopes the hint to the signed-in user so a shared browser cannot inherit it', () => {
    authUserId = 'user_other'
    render(<DiscoveryShelf />)
    expect(readHint()).toBe('user_other:1')
  })

  it('leaves a previously recorded hint untouched while the entitlement is still resolving', () => {
    // Regression guard: writing mid-resolution would clear the hint on every
    // cold load, so the fallback could never reserve the shelf footprint —
    // which is the entire point of the cookie.
    document.cookie = `${SHELF_HINT_COOKIE}=user_viewer:1; path=/`
    entitlement = { isLoading: true, active: false, surface: null }
    render(<DiscoveryShelf />)
    expect(readHint()).toBe('user_viewer:1')
  })

  it('leaves the hint untouched while the connection is still resolving', () => {
    document.cookie = `${SHELF_HINT_COOKIE}=user_viewer:1; path=/`
    connection = { data: undefined }
    render(<DiscoveryShelf />)
    expect(readHint()).toBe('user_viewer:1')
  })

  it('leaves the hint untouched before Clerk resolves the user', () => {
    document.cookie = `${SHELF_HINT_COOKIE}=user_viewer:1; path=/`
    authUserId = null
    render(<DiscoveryShelf />)
    expect(readHint()).toBe('user_viewer:1')
  })
})
