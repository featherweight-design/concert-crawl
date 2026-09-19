// @vitest-environment jsdom

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EntitlementResult } from '@/lib/queries/use-entitlement'

const mockPush = vi.fn()
const mockBack = vi.fn()
const mockSetQuery = vi.fn()
const mockClearQuery = vi.fn()
const mockNavigateTo = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  // FollowButton builds its signed-out return-to href from these (PR 5).
  usePathname: () => '/search',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
vi.mock('../identity-art/IdentityArt', () => ({
  IdentityArt: () => <div data-testid="identity-art" />,
}))

const baseHook = {
  query: '',
  setQuery: mockSetQuery,
  clearQuery: mockClearQuery,
  recentSearches: [],
  popularEvents: [],
  artistResults: [],
  artistPageResults: [],
  venueResults: [],
  isLoading: false,
  navigateTo: mockNavigateTo,
}

vi.mock('../../../lib/search/useSearch', () => ({
  useSearch: () => baseHook,
}))

// ── Native following, PR 5 ────────────────────────────────────────────────
// The artist-page rows now carry a live Follow button, so the section reads
// Clerk, the entitlement and the plan. Everything below is the surrounding
// wiring; the follow behaviour itself is asserted, not mocked away.

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

// A stand-in for the real optimistic hook: it flips in place, which is exactly
// the behaviour the row is required to show (no collapse, no re-order).
const mockToggle = vi.fn()
vi.mock('@/components/consumer/artist-page/lib/use-artist-follow', () => ({
  useArtistFollow: (_slug: string, initialFollowing: boolean) => {
    const [following, setFollowing] = React.useState(initialFollowing)
    return {
      following,
      toggle: () => {
        mockToggle()
        setFollowing((prev) => !prev)
      },
    }
  },
}))

// jsdom has no matchMedia, and `useMediaQuery` reads it during render. `false`
// for every query is the widest-first default the hook itself ships.
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
  authState.isSignedIn = true
  entitlementState.current = {
    isLoading: false,
    active: true,
    surface: 'visible-active',
  }
})

import type { ArtistSearchResult } from '@concert-crawl/types'
import { SearchDefaultState } from './SearchDefaultState'
import { SearchResultsState } from './SearchResultsState'
import { SearchEmptyState } from './SearchEmptyState'
import { ARTIST_COPY } from '@/components/consumer/artist-page/definitions/copy'
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy'
import { SEARCH_DESKTOP_QUERY } from './definitions/constants'

/** Make one media query report a match, leaving every other query `false`. */
const matchOnly = (matching: string) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === matching,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SearchDefaultState', () => {
  it('renders recent section when recent searches exist', () => {
    const recentSearches = ['godspeed you', 'bluebird']
    render(
      <SearchDefaultState
        recentSearches={recentSearches}
        popularEvents={[]}
        onPickQuery={mockSetQuery}
        onPickEvent={mockNavigateTo}
      />,
    )
    expect(screen.getByText('Recent')).toBeTruthy()
    expect(screen.getByText('godspeed you')).toBeTruthy()
    expect(screen.getByText('bluebird')).toBeTruthy()
  })

  it('calls onPickQuery when a recent row is tapped', () => {
    render(
      <SearchDefaultState
        recentSearches={['bluebird']}
        popularEvents={[]}
        onPickQuery={mockSetQuery}
        onPickEvent={mockNavigateTo}
      />,
    )
    fireEvent.click(screen.getByText('bluebird'))
    expect(mockSetQuery).toHaveBeenCalledWith('bluebird')
  })

  // The row hand-rolled its own 40px box and drew IdentityArt directly, so a
  // show with real artwork still got a generated mark, at `hero` density in a
  // 40px box. It goes through the slot now, like every other event row.
  it('draws the event artwork on a popular row rather than a generated mark', () => {
    const { container } = render(
      <SearchDefaultState
        recentSearches={[]}
        popularEvents={[
          {
            id: 'ev-art',
            title: 'Show A',
            artist: 'Artist A',
            date: '2027-06-01',
            imageUrl: 'https://cdn.test/flyer.jpg',
            artistPhotoUrl: null,
            ticketPriceMin: '25',
            watcherCount: 3,
            venue: { name: 'Globe Hall', slug: 'globe-hall' },
          },
        ]}
        onPickQuery={mockSetQuery}
        onPickEvent={mockNavigateTo}
      />,
    )

    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.test/flyer.jpg',
    )
  })

  it('renders popular section with event rows', () => {
    const popular = [
      {
        id: 'ev-1',
        title: 'Show A',
        artist: 'Artist A',
        supportingArtists: null,
        tourName: null,
        date: '2027-06-01',
        imageUrl: null,
        artistPhotoUrl: null,
        ticketPriceMin: '25',
        watcherCount: 3,
        venue: { name: 'Globe Hall', slug: 'globe-hall' },
      },
    ]
    render(
      <SearchDefaultState
        recentSearches={[]}
        popularEvents={popular}
        onPickQuery={mockSetQuery}
        onPickEvent={mockNavigateTo}
      />,
    )
    expect(screen.getByText('Popular this week')).toBeTruthy()
    expect(screen.getByText('Artist A')).toBeTruthy()
  })
})

describe('SearchResultsState', () => {
  it('renders artist section with count', () => {
    const artists = [
      { name: 'Radiohead', nextDate: '2027-06-01', venueShort: 'Red Rocks' },
    ]
    render(
      <SearchResultsState
        artistResults={artists}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    )
    expect(screen.getByText('Artists · 1')).toBeTruthy()
    expect(screen.getByText('Radiohead')).toBeTruthy()
  })

  it('renders venue section with count', () => {
    const venues = [
      {
        name: 'Bluebird Theater',
        slug: 'bluebird-theater',
        showCount: 4,
        matchingEventId: 'evt-1',
      },
    ]
    render(
      <SearchResultsState
        artistResults={[]}
        venueResults={venues}
        onNavigateTo={mockNavigateTo}
      />,
    )
    expect(screen.getByText('Venues · 1')).toBeTruthy()
    expect(screen.getByText('Bluebird Theater')).toBeTruthy()
  })

  it('calls onNavigateTo with artist on tap', () => {
    const artists = [
      { name: 'Radiohead', nextDate: '2027-06-01', venueShort: 'Red Rocks' },
    ]
    render(
      <SearchResultsState
        artistResults={artists}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    )
    fireEvent.click(screen.getByText('Radiohead'))
    expect(mockNavigateTo).toHaveBeenCalledWith('artist', 'Radiohead')
  })

  it('calls onNavigateTo with venue on tap', () => {
    const venues = [
      {
        name: 'Bluebird Theater',
        slug: 'bluebird-theater',
        showCount: 4,
        matchingEventId: 'evt-1',
      },
    ]
    render(
      <SearchResultsState
        artistResults={[]}
        venueResults={venues}
        onNavigateTo={mockNavigateTo}
      />,
    )
    fireEvent.click(screen.getByText('Bluebird Theater'))
    expect(mockNavigateTo).toHaveBeenCalledWith('venue', {
      slug: 'bluebird-theater',
      matchingEventId: 'evt-1',
    })
  })
})

describe('SearchEmptyState', () => {
  it('renders the query in the no-results title', () => {
    render(<SearchEmptyState query="thee oh sees" />)
    expect(screen.getByText(/No results for "thee oh sees"/)).toBeTruthy()
  })

  it('falls back to generic title when query is empty', () => {
    render(<SearchEmptyState query="" />)
    expect(screen.getByText(/Nothing under that name/)).toBeTruthy()
  })

  it('renders browse CTA linking to /events', () => {
    render(<SearchEmptyState query="thee oh sees" />)
    const link = screen.getByRole('link', { name: /Browse all shows/i })
    expect(link.getAttribute('href')).toBe('/events')
  })
})

describe('SearchResultsState — artist pages (#1115 PR-G)', () => {
  const ARTIST_PAGES = [
    {
      name: 'Radiohead',
      slug: 'radiohead',
      photoUrl: null,
      upcomingShowCount: 2,
      // PR 5 renders the inline Follow button off this; PR 3 only adds the
      // field to the contract.
      following: false,
    },
  ]

  it('renders the artist-pages section with its own header and count', () => {
    render(
      <SearchResultsState
        artistResults={[]}
        artistPageResults={ARTIST_PAGES}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    )
    expect(screen.getByText('Artist pages · 1')).toBeTruthy()
    expect(screen.getByText('Radiohead')).toBeTruthy()
    expect(screen.getByText('2 upcoming shows')).toBeTruthy()
    expect(screen.getByText('Artist page')).toBeTruthy()
  })

  it('shows the past-shows-only label when nothing is upcoming', () => {
    render(
      <SearchResultsState
        artistResults={[]}
        artistPageResults={[{ ...ARTIST_PAGES[0]!, upcomingShowCount: 0 }]}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    )
    expect(screen.getByText('Past shows only')).toBeTruthy()
  })

  // Conformance, not a design call: a photoless artist gets the same
  // IdentityArt every other surface shows, rather than a generic mic icon.
  it('falls to identity art for a photoless artist', () => {
    const { container } = render(
      <SearchResultsState
        artistResults={[]}
        artistPageResults={ARTIST_PAGES}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    )
    expect(screen.getAllByTestId('identity-art').length).toBeGreaterThan(0)
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders the portrait when the artist has one', () => {
    const { container } = render(
      <SearchResultsState
        artistResults={[]}
        artistPageResults={[
          { ...ARTIST_PAGES[0]!, photoUrl: 'https://i.scdn.co/image/rh' },
        ]}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    )
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://i.scdn.co/image/rh',
    )
    // Decorative: the row already renders the name as text, so a populated alt
    // would land in the button's accessible name and announce it twice.
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('')
  })

  it('routes an artist-page row to the page, not a filtered browse', () => {
    render(
      <SearchResultsState
        artistResults={[]}
        artistPageResults={ARTIST_PAGES}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    )
    fireEvent.click(screen.getByText('Radiohead'))
    expect(mockNavigateTo).toHaveBeenCalledWith('artistPage', {
      slug: 'radiohead',
    })
  })

  it('renders nothing extra when there are no artist pages', () => {
    render(
      <SearchResultsState
        artistResults={[
          {
            name: 'Radiohead',
            nextDate: '2027-06-01',
            venueShort: 'Red Rocks',
          },
        ]}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
      />,
    )
    expect(screen.queryByText(/Artist pages/)).toBeNull()
  })

  it('offsets the event-derived sections so keyboard indices stay unique', () => {
    render(
      <SearchResultsState
        artistResults={[
          {
            name: 'Radiohead',
            nextDate: '2027-06-01',
            venueShort: 'Red Rocks',
          },
        ]}
        artistPageResults={ARTIST_PAGES}
        venueResults={[]}
        selectedIdx={1}
        onNavigateTo={mockNavigateTo}
      />,
    )
    // Index 0 is the artist-page row; index 1 must be the event-derived row.
    const selected = document.querySelectorAll('[data-selected="true"]')
    expect(selected).toHaveLength(1)
    expect(selected[0]?.textContent).toContain('Red Rocks')
  })
})

describe('SearchResultsState — inline following (native following PR 5)', () => {
  const artistPage = (
    overrides: Partial<ArtistSearchResult> = {},
  ): ArtistSearchResult => ({
    name: 'Radiohead',
    slug: 'radiohead',
    photoUrl: null,
    upcomingShowCount: 2,
    following: false,
    ...overrides,
  })

  const renderRows = (
    artistPageResults: ArtistSearchResult[] = [artistPage()],
    props: Partial<React.ComponentProps<typeof SearchResultsState>> = {},
  ) =>
    render(
      <SearchResultsState
        artistResults={[]}
        artistPageResults={artistPageResults}
        venueResults={[]}
        onNavigateTo={mockNavigateTo}
        {...props}
      />,
    )

  it('puts a live Follow button on the row itself, not one tap in', () => {
    renderRows()
    const button = screen.getByLabelText(ARTIST_COPY.followAria('Radiohead'))
    expect(button.hasAttribute('disabled')).toBe(false)
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  // The clearest case the whole feature exists for: nothing on the books yet.
  // The row says so and still lets you follow.
  it('keeps the button live for an artist with nothing upcoming', () => {
    renderRows([artistPage({ upcomingShowCount: 0 })])
    expect(screen.getByText('Past shows only')).toBeTruthy()
    const button = screen.getByLabelText(ARTIST_COPY.followAria('Radiohead'))
    expect(button.hasAttribute('disabled')).toBe(false)
    fireEvent.click(button)
    expect(mockToggle).toHaveBeenCalledTimes(1)
  })

  it('updates the row in place on follow, without collapsing or re-ordering', () => {
    renderRows([artistPage(), artistPage({ name: 'Ratbag', slug: 'ratbag' })])
    const names = () =>
      Array.from(document.querySelectorAll('[data-selected], button')).length
    const before = names()
    fireEvent.click(screen.getByLabelText(ARTIST_COPY.followAria('Radiohead')))

    // Same row, same position, same neighbours — only the state flipped.
    expect(
      screen.getByLabelText(ARTIST_COPY.followingAria('Radiohead')),
    ).toBeTruthy()
    expect(screen.getByText('Radiohead')).toBeTruthy()
    expect(screen.getByText('Ratbag')).toBeTruthy()
    expect(screen.getByLabelText(ARTIST_COPY.followAria('Ratbag'))).toBeTruthy()
    expect(names()).toBe(before)
  })

  // Locked is never `disabled` — a locked tap is how the upgrade gets offered.
  it('locked: results still render and a tap opens the paywall picker', () => {
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    }
    renderRows()
    expect(screen.getByText('Radiohead')).toBeTruthy()
    const button = screen.getByLabelText(ARTIST_COPY.followAria('Radiohead'))
    expect(button.hasAttribute('disabled')).toBe(false)
    expect(button.getAttribute('aria-haspopup')).toBe('dialog')
    fireEvent.click(button)
    expect(screen.getByTestId('tier-picker').getAttribute('data-entry')).toBe(
      'paywall',
    )
    expect(mockToggle).not.toHaveBeenCalled()
  })

  // A downgraded user must always be able to let go of a follow they hold.
  it('locked: an already-followed row stays live so it can be undone', () => {
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    }
    renderRows([artistPage({ following: true })])
    fireEvent.click(
      screen.getByLabelText(ARTIST_COPY.followingAria('Radiohead')),
    )
    expect(mockToggle).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('tier-picker')).toBeNull()
  })

  it('signed out: the row renders and a tap never fires a tokenless write', () => {
    authState.isSignedIn = false
    entitlementState.current = {
      isLoading: false,
      active: false,
      surface: 'tier-picker-on-tap',
    }
    renderRows()
    const button = screen.getByLabelText(
      ARTIST_COPY.followSignedOutAria('Radiohead'),
    )
    expect(button.hasAttribute('disabled')).toBe(false)
    fireEvent.click(button)
    expect(mockToggle).not.toHaveBeenCalled()
  })

  // The window where Clerk has not answered yet. Treated as signed out so the
  // tap opens a picker instead of throwing `Not authenticated`.
  it('unresolved session: a tap opens the picker rather than writing', () => {
    authState.isSignedIn = undefined
    entitlementState.current = { isLoading: true, active: false, surface: null }
    renderRows()
    fireEvent.click(
      screen.getByLabelText(ARTIST_COPY.followSignedOutAria('Radiohead')),
    )
    expect(mockToggle).not.toHaveBeenCalled()
  })

  // ...but an already-followed row proves a session on its own, so it must not
  // flash back to "Follow" while Clerk resolves.
  it('unresolved session: an already-followed row stays following', () => {
    authState.isSignedIn = undefined
    entitlementState.current = { isLoading: true, active: false, surface: null }
    renderRows([artistPage({ following: true })])
    expect(
      screen.getByLabelText(ARTIST_COPY.followingAria('Radiohead')),
    ).toBeTruthy()
  })

  // The palette draws the same component in 560px of overlay, so the rail is
  // opt-in rather than a width check alone.
  it('the explainer rail never appears without the opt-in', () => {
    matchOnly(SEARCH_DESKTOP_QUERY)
    renderRows()
    expect(screen.queryByText(FOLLOWING_COPY.searchRailEyebrow)).toBeNull()
  })

  it('desktop: the opt-in rail renders beside the results', () => {
    matchOnly(SEARCH_DESKTOP_QUERY)
    renderRows([artistPage()], { withExplainerRail: true })
    expect(screen.getByText(FOLLOWING_COPY.searchRailEyebrow)).toBeTruthy()
    expect(screen.getByText(FOLLOWING_COPY.searchRailNoDates)).toBeTruthy()
  })

  it('desktop: no artist rows means no rail to explain them', () => {
    matchOnly(SEARCH_DESKTOP_QUERY)
    render(
      <SearchResultsState
        artistResults={[
          {
            name: 'Radiohead',
            nextDate: '2027-06-01',
            venueShort: 'Red Rocks',
          },
        ]}
        artistPageResults={[]}
        venueResults={[]}
        withExplainerRail
        onNavigateTo={mockNavigateTo}
      />,
    )
    expect(screen.queryByText(FOLLOWING_COPY.searchRailEyebrow)).toBeNull()
  })

  // The rail shipped desktop-only, so mobile got the artist rows and no
  // explanation of what following one does. Only the shape forks on viewport.
  it('mobile: the same case renders as a footnote under the results', () => {
    matchOnly('(max-width: 1px)')
    renderRows([artistPage()], { withExplainerRail: true })
    expect(screen.getByText(FOLLOWING_COPY.searchRailBody)).toBeTruthy()
    // The eyebrow labels a column that does not exist at this width.
    expect(screen.queryByText(FOLLOWING_COPY.searchRailEyebrow)).toBeNull()
  })

  it('mobile: no artist rows means no footnote', () => {
    matchOnly('(max-width: 1px)')
    renderRows([], { withExplainerRail: true })
    expect(screen.queryByText(FOLLOWING_COPY.searchRailBody)).toBeNull()
  })
})
