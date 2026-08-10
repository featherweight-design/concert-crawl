// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import type { FollowedArtist } from '@concert-crawl/types'
import { MyShowsArtistsContent } from './MyShowsArtistsContent'
import { MY_SHOWS_ARTISTS_COPY } from './definitions/copy'
import { HISTORY_COPY } from '@/components/consumer/history/definitions/copy'

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: () => Promise.resolve('token'),
    isSignedIn: true,
    userId: 'user_1',
  }),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/following',
  useSearchParams: () => new URLSearchParams(),
}))

// Entitlement and plan both come from React Query; the surface under test is
// what the list renders, not how the plan resolves.
vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => ({
    isLoading: false,
    active: true,
    surface: 'visible-active',
  }),
}))
vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: null }),
}))
vi.mock('@/lib/queries/use-notification-preferences', () => ({
  useNotificationPreferences: () => ({
    data: {
      masterEnabled: true,
      watchUpdatesEnabled: true,
      priceDropsEnabled: true,
      artistAlertsEnabled: true,
      artistAutoWatch: false,
      weeklyDigestEnabled: true,
    },
  }),
}))
vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: () => null,
}))

beforeAll(() => {
  // jsdom ships no matchMedia; the narrow-density effect reads it on mount.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  })
})

afterEach(cleanup)

const artist = (
  name: string,
  iso: string | null,
  source: FollowedArtist['source'] = 'manual',
): FollowedArtist => ({
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  canonicalName: name.toLowerCase(),
  photoUrl: null,
  source,
  followedAt: '2026-08-01T00:00:00.000Z',
  nextShow:
    iso === null
      ? null
      : {
          eventId: `evt-${name}`,
          iso,
          venue: 'Bluebird Theater',
          venueSlug: 'bluebird-theater',
          price: 28,
        },
})

const COPY = MY_SHOWS_ARTISTS_COPY

describe('MyShowsArtistsContent', () => {
  it('renders both group headings as second-level headings', () => {
    render(
      <MyShowsArtistsContent
        artists={[
          artist('Wax Harbour', '2026-09-12'),
          artist('Null Signal', null),
        ]}
        scaRegion={false}
      />,
    )

    expect(
      screen.getAllByRole('heading', { level: 2, name: COPY.groups.dated(1) }),
    ).not.toHaveLength(0)
    expect(
      screen.getAllByRole('heading', {
        level: 2,
        name: COPY.groups.undated(1),
      }),
    ).not.toHaveLength(0)
  })

  // Three-up put a 940px column's cards at 285px, which ellipsised the artist
  // NAME on desktop while mobile rendered it in full. The labelled unfollow
  // control is deliberate, so the grid is what gives way.
  it('lays the desktop cards out two-up, never three', () => {
    const { container } = render(
      <MyShowsArtistsContent
        artists={[
          artist('Wax Harbour', '2026-09-12'),
          artist('Null Signal', null),
        ]}
        scaRegion={false}
      />,
    )

    // Scoped to the desktop block: a nested component is free to draw its own
    // grid at any width, and this test is about the artist cards only.
    const desktop = container.querySelector(
      '[data-testid="my-shows-artists-desktop"]',
    )
    const grids = desktop?.querySelectorAll('[class*="grid-cols-"]') ?? []
    // Both groups (dated and undated) must be present, or the assertion below
    // passes over an empty list and proves nothing.
    expect(grids).toHaveLength(2)
    for (const grid of grids) {
      expect(grid.className).toContain('grid-cols-2')
      expect(grid.className).not.toContain('grid-cols-3')
    }
  })

  // A heading over nothing is a heading that lies about there being content.
  it('renders no undated heading when every follow has a date', () => {
    render(
      <MyShowsArtistsContent
        artists={[artist('Wax Harbour', '2026-09-12')]}
        scaRegion={false}
      />,
    )

    expect(screen.queryByText(COPY.groups.undated(0))).toBeNull()
  })

  it('carries the follow count on the Artists sub-tab', () => {
    render(
      <MyShowsArtistsContent
        artists={[artist('One', '2026-09-12'), artist('Two', null)]}
        scaRegion={false}
      />,
    )

    expect(
      screen.getAllByRole('link', {
        name: HISTORY_COPY.tabs.tabCountAria(HISTORY_COPY.tabs.artists, 2),
      }),
    ).not.toHaveLength(0)
  })

  it('shows the Spotify footnote only when a follow came from Spotify', () => {
    render(
      <MyShowsArtistsContent
        artists={[artist('One', '2026-09-12', 'spotify_followed')]}
        scaRegion={false}
      />,
    )
    expect(screen.getAllByText(COPY.spotifyFootnote(1))).not.toHaveLength(0)

    cleanup()
    render(
      <MyShowsArtistsContent
        artists={[artist('One', '2026-09-12')]}
        scaRegion={false}
      />,
    )
    expect(screen.queryByText(COPY.spotifyFootnote(1))).toBeNull()
  })

  it('offers the find row and the alerts deep link', () => {
    render(
      <MyShowsArtistsContent
        artists={[artist('One', '2026-09-12')]}
        scaRegion={false}
      />,
    )

    expect(
      screen.getAllByRole('link', { name: new RegExp(COPY.find.title) }),
    ).not.toHaveLength(0)
    expect(
      screen.getAllByRole('link', { name: new RegExp(COPY.alerts.title) })[0],
    ).toHaveAttribute('href', '/me#notifications')
  })

  // Alerts is the surface's only notification affordance. Trailing the list put
  // it below however many follows the viewer had, so a long list hid it
  // entirely. Both densities must carry it above the first group.
  it.each(['mobile', 'desktop'])(
    'puts alerts and the Spotify footnote above the list on %s',
    (density) => {
      const { container } = render(
        <MyShowsArtistsContent
          artists={[
            artist('Wax Harbour', '2026-09-12', 'spotify_followed'),
            artist('Null Signal', null),
          ]}
          scaRegion={false}
        />,
      )

      const block = container.querySelector(
        `[data-testid="my-shows-artists-${density}"]`,
      )
      if (!(block instanceof HTMLElement)) throw new Error('no density block')
      const scope = within(block)

      const alerts = scope.getByRole('link', {
        name: new RegExp(COPY.alerts.title),
      })
      const footnote = scope.getByText(COPY.spotifyFootnote(1))
      const [firstHeading] = scope.getAllByRole('heading', { level: 2 })
      if (firstHeading === undefined) throw new Error('no group heading')

      for (const node of [alerts, footnote]) {
        expect(
          node.compareDocumentPosition(firstHeading) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy()
      }
    },
  )

  it('renders the empty state when the viewer follows nobody', () => {
    render(<MyShowsArtistsContent artists={[]} scaRegion={false} />)

    expect(screen.getAllByText(COPY.empty.headline)).not.toHaveLength(0)
    expect(
      screen.getAllByRole('link', { name: COPY.empty.primary }),
    ).not.toHaveLength(0)
  })

  // A failed read is not a claim that the account is empty.
  it('renders an error rather than the empty state when the fetch failed', () => {
    render(<MyShowsArtistsContent artists={undefined} scaRegion={false} />)

    expect(screen.getByText(COPY.error)).toBeInTheDocument()
    expect(screen.queryByText(COPY.empty.headline)).toBeNull()
  })
})
