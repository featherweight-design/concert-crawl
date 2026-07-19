// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
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

let entitlement: EntitlementState
let picksQuery: PicksQueryState
let picksEnabledArg: boolean | undefined

vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => entitlement,
}))

vi.mock('@/lib/queries/use-taste-picks', () => ({
  useTastePicks: (enabled: boolean) => {
    picksEnabledArg = enabled
    return picksQuery
  },
}))

vi.mock('./OAuthHandoffSheet', () => ({
  OAuthHandoffSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="handoff-sheet" /> : null,
}))

import { DiscoveryShelf } from './DiscoveryShelf'
import { SPOTIFY_COPY } from './definitions/copy'

const COPY = SPOTIFY_COPY.discovery

const pick = (overrides: Partial<SpotifyTastePick> = {}): SpotifyTastePick => ({
  eventId: 'evt-1',
  artist: 'Turnstile',
  title: 'Turnstile',
  imageUrl: null,
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
  picksEnabledArg = undefined
})

describe('DiscoveryShelf', () => {
  it('renders nothing while the entitlement is resolving', () => {
    entitlement = { isLoading: true, active: false, surface: null }
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
})
