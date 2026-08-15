// @vitest-environment jsdom

import type {
  ArtistDetailResponse,
  ArtistShow,
  PlanState,
} from '@concert-crawl/types'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ArtistPageContent } from './ArtistPageContent'
import { AP_STICKY_AFTER, AP_STICKY_BAR_H } from './definitions/constants'
import { ARTIST_COPY } from './definitions/copy'

// The mobile hero renders BackChip, which reaches for the app router.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  usePathname: () => '/artists/neal-francis',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: () => null,
}))

const { plan } = vi.hoisted(
  (): { plan: { current: PlanState | undefined } } => ({
    plan: { current: undefined },
  }),
)

vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: plan.current }),
}))

const planOn = (tier: PlanState['plan'], roleComped = false): PlanState => ({
  plan: tier,
  onTrial: false,
  trialEndsAt: null,
  status: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  roleComped,
})

vi.mock('@/components/consumer/watch-show-button/WatchShowButton', () => ({
  WatchShowButton: () => <button data-testid="watch-stub" type="button" />,
}))

// The player asks the provider which plate colour to hand Spotify.
vi.mock('@/theme', () => ({
  useTheme: () => ({ theme: 'electric', setTheme: () => undefined }),
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'token', isSignedIn: true }),
}))

const base: ArtistDetailResponse = {
  artist: {
    name: 'Neal Francis',
    slug: 'neal-francis',
    spotifyArtistId: null,
    photoUrl: null,
  },
  shows: [],
  past: [],
  history: { count: 0, venues: [] },
  following: null,
}

const show = (iso: string, venue: string): ArtistShow => ({
  eventId: `${venue}-${iso}`,
  iso,
  showTime: null,
  venue,
  venueSlug: venue.toLowerCase().replace(/\s+/g, '-'),
  city: 'Denver',
  price: null,
  tourName: null,
  genres: [],
  imageUrl: null,
  status: 'upcoming',
})

const withShows: ArtistDetailResponse = {
  ...base,
  shows: [show('2026-09-12', 'Hi Dive'), show('2026-10-01', 'Bluebird')],
}

const withPast: ArtistDetailResponse = {
  ...base,
  past: [
    {
      eventId: 'evt_1',
      iso: '2026-05-04',
      venue: 'Larimer Lounge',
      venueSlug: 'larimer-lounge',
      city: 'Denver',
    },
  ],
  history: { count: 1, venues: ['Larimer Lounge'] },
}

/** jsdom ships no matchMedia; this is the only viewport switch on the page. */
const setViewport = (desktop: boolean) => {
  window.matchMedia = (query: string) => ({
    matches: desktop,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })
}

const scrollTo = (position: number) => {
  act(() => {
    window.scrollY = position
    fireEvent.scroll(window)
  })
}

/** Every accessible name a follow control can carry, in any state. */
const followNames = (name: string) => [
  ARTIST_COPY.followAria(name),
  ARTIST_COPY.followingAria(name),
  ARTIST_COPY.followSignedOutAria(name),
]

const countFollows = (container: HTMLElement, name: string) =>
  Array.from(container.querySelectorAll('button')).filter((button) =>
    followNames(name).includes(button.getAttribute('aria-label') ?? ''),
  ).length

beforeEach(() => {
  setViewport(false)
  window.scrollY = 0
  plan.current = undefined
})

afterEach(cleanup)

describe('ArtistPageContent', () => {
  // The wrapper carries the block's top margin, so rendering it around a
  // PastShows that returned null leaves a visible gap under the last row.
  it('omits the past-shows wrapper entirely when there are no past shows', () => {
    const { container } = render(<ArtistPageContent data={base} />)
    expect(container.querySelector('.ap-block-past')).toBeNull()
  })

  it('renders the past-shows wrapper when there are past shows', () => {
    const { container } = render(<ArtistPageContent data={withPast} />)
    expect(container.querySelector('.ap-block-past')).not.toBeNull()
  })

  // The handoff is explicit: enforce this in code, not by convention.
  describe('exactly one live follow affordance', () => {
    it('(a) mobile, has shows, scrolled — the sticky bar owns it', () => {
      const { container } = render(<ArtistPageContent data={withShows} />)
      expect(countFollows(container, 'Neal Francis')).toBe(1)

      scrollTo(AP_STICKY_AFTER + 10)
      expect(container.querySelector('[data-sticky-bar]')).not.toBeNull()
      expect(countFollows(container, 'Neal Francis')).toBe(1)
      // The one that survived is the sticky bar's.
      const follow = container.querySelector(
        '[data-sticky-bar] button[aria-label]',
      )
      expect(follow).not.toBeNull()
    })

    it('(b) mobile, no shows — the empty block owns it', () => {
      const { container } = render(<ArtistPageContent data={base} />)
      expect(countFollows(container, 'Neal Francis')).toBe(1)
      const empty = container.querySelector('[data-empty-upcoming]')
      expect(countFollows(empty as HTMLElement, 'Neal Francis')).toBe(1)

      // The bar may arrive, but it must not grow a second follow.
      scrollTo(AP_STICKY_AFTER + 10)
      expect(countFollows(container, 'Neal Francis')).toBe(1)
    })

    it('(c) desktop, has shows — the sticky rail owns it, no sub-header', () => {
      setViewport(true)
      const { container } = render(<ArtistPageContent data={withShows} />)
      expect(countFollows(container, 'Neal Francis')).toBe(1)
      const rail = container.querySelector('.ap-rail')
      expect(countFollows(rail as HTMLElement, 'Neal Francis')).toBe(1)

      scrollTo(AP_STICKY_AFTER + 400)
      expect(container.querySelector('[data-sticky-bar]')).toBeNull()
      expect(countFollows(container, 'Neal Francis')).toBe(1)
    })

    it('(d) desktop, no shows — the empty block stays copy only', () => {
      setViewport(true)
      const { container } = render(<ArtistPageContent data={base} />)
      expect(countFollows(container, 'Neal Francis')).toBe(1)
      const empty = container.querySelector('[data-empty-upcoming]')
      expect(countFollows(empty as HTMLElement, 'Neal Francis')).toBe(0)
    })
  })

  // `HeroBand` steps its panel to 208 and grows its padding at `sm` (640) while
  // this page keeps its mobile layout until `md` (768). Between those widths a
  // fixed 218px assumption brought the bar up over a band still on screen.
  it('times the sticky bar off the measured band, not a fixed height', () => {
    const TALL = 322
    const observers: (() => void)[] = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly cb: () => void) {}
        observe() {
          observers.push(this.cb)
        }
        disconnect() {}
        unobserve() {}
      },
    )
    const height = vi
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockReturnValue(TALL)

    const { container } = render(<ArtistPageContent data={withShows} />)
    expect(observers.length).toBeGreaterThan(0)

    // Past the old constant, but the band is still on screen.
    scrollTo(AP_STICKY_AFTER + 10)
    expect(container.querySelector('[data-sticky-bar]')).toBeNull()

    scrollTo(TALL - AP_STICKY_BAR_H + 10)
    expect(container.querySelector('[data-sticky-bar]')).not.toBeNull()

    height.mockRestore()
    vi.unstubAllGlobals()
  })

  it('gives the sticky bar its follow flag from the page, not from itself', () => {
    const { container, rerender } = render(
      <ArtistPageContent data={withShows} />,
    )
    scrollTo(AP_STICKY_AFTER + 10)
    expect(
      container.querySelector('[data-sticky-bar] button[aria-label]'),
    ).not.toBeNull()

    rerender(<ArtistPageContent data={base} />)
    const bar = container.querySelector('[data-sticky-bar]')
    expect(bar).not.toBeNull()
    expect(countFollows(bar as HTMLElement, 'Neal Francis')).toBe(0)
  })

  it('walks back → follow → skip player → iframe → rows → show all', () => {
    const data: ArtistDetailResponse = {
      ...withShows,
      artist: { ...base.artist, spotifyArtistId: '3TVXtAsR1Inumwj472S9r4' },
    }
    const { container } = render(<ArtistPageContent data={data} />)

    const focusables = Array.from(
      container.querySelectorAll('a[href], button, iframe'),
    )
    const indexOf = (node: Element | null) => {
      expect(node).not.toBeNull()
      return focusables.indexOf(node as Element)
    }

    const back = indexOf(container.querySelector('button[aria-label="Back"]'))
    const follow = indexOf(
      Array.from(container.querySelectorAll('button')).find((button) =>
        followNames('Neal Francis').includes(
          button.getAttribute('aria-label') ?? '',
        ),
      ) ?? null,
    )
    const skip = indexOf(container.querySelector('a.ap-skip'))
    const iframe = indexOf(container.querySelector('iframe'))
    const firstRow = indexOf(container.querySelector('a[href^="/events/"]'))

    expect(back).toBeLessThan(follow)
    expect(follow).toBeLessThan(skip)
    expect(skip).toBeLessThan(iframe)
    expect(iframe).toBeLessThan(firstRow)
  })

  // The gate is asked once, here, and passed down — six surfaces each asking
  // for themselves is how one of them ships ungated (design R2 did exactly
  // that by testing `tier === 'free'` inline).
  describe('the follow gate', () => {
    const signedIn: ArtistDetailResponse = { ...withShows, following: false }
    const lockGlyph = (container: HTMLElement) =>
      container.querySelector('[data-glyph="lock"]')

    it('locks a plan that cannot follow', () => {
      plan.current = planOn('supporter')
      const { container } = render(<ArtistPageContent data={signedIn} />)
      expect(lockGlyph(container)).not.toBeNull()
    })

    it('leaves a premium plan live', () => {
      plan.current = planOn('premium')
      const { container } = render(<ArtistPageContent data={signedIn} />)
      expect(lockGlyph(container)).toBeNull()
    })

    it('leaves a comped free account live', () => {
      // roleComped is an override the matrix does not encode, which is why the
      // page asks nfLocked(planState) and never `plan === 'free'`.
      plan.current = planOn('free', true)
      const { container } = render(<ArtistPageContent data={signedIn} />)
      expect(lockGlyph(container)).toBeNull()
    })

    it('never flashes a lock while the plan is still resolving', () => {
      plan.current = undefined
      const { container } = render(<ArtistPageContent data={signedIn} />)
      expect(lockGlyph(container)).toBeNull()
    })

    it('leaves an existing follow unlocked after a downgrade, so it can be undone', () => {
      // Eng spec §3.2: downgrading never deletes follows, and DELETE is
      // unentitled by design. A locked skin here would strand the follow on
      // the one surface a user would go to to remove it.
      plan.current = planOn('free')
      const { container } = render(
        <ArtistPageContent data={{ ...withShows, following: true }} />,
      )
      expect(lockGlyph(container)).toBeNull()
    })

    it('does not lock a signed-out visitor, who gets the sign-in hand-off', () => {
      plan.current = planOn('logged-out')
      const { container } = render(<ArtistPageContent data={withShows} />)
      expect(lockGlyph(container)).toBeNull()
    })
  })

  it('drops the player block when we have no Spotify match', () => {
    const { container } = render(<ArtistPageContent data={withShows} />)
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.textContent).toContain(ARTIST_COPY.playerNone)
  })

  // #1525 — the hero is a band now, not a full-bleed plate.
  describe('the imagery band', () => {
    const photo = 'https://i.example.com/neal.jpg'
    const withPhoto: ArtistDetailResponse = {
      ...base,
      artist: { ...base.artist, photoUrl: photo },
    }

    it('names the headliner exactly once across the whole page', () => {
      const { container } = render(<ArtistPageContent data={withShows} />)
      expect(container.querySelectorAll('h1')).toHaveLength(1)
      expect(container.querySelector('h1')?.textContent).toBe('Neal Francis')

      cleanup()
      setViewport(true)
      const desktop = render(<ArtistPageContent data={withShows} />).container
      expect(desktop.querySelectorAll('h1')).toHaveLength(1)
    })

    it('falls to generated art when the portrait URL has expired', () => {
      // A signed press URL can die between the server render and the browser's
      // request, so the fallback is a render-time gate, not a fetch-time one.
      const { container } = render(<ArtistPageContent data={withPhoto} />)
      const band = container.querySelector('[data-testid="hero-band"]')
      const slot = band?.querySelector<HTMLElement>('.w-32 > *')
      const image = band?.querySelector('img')
      if (!(image instanceof HTMLImageElement)) throw new Error('no portrait')

      const before = slot?.getAttribute('style')
      act(() => {
        fireEvent.error(image)
      })

      expect(band?.querySelector('img')).toBeNull()
      expect(band?.querySelector('svg')).not.toBeNull()
      // The box is unchanged, so the fallback costs no layout shift.
      expect(
        band?.querySelector<HTMLElement>('.w-32 > *')?.getAttribute('style'),
      ).toBe(before)
    })

    it('draws generated art rather than borrowing a show poster', () => {
      // §2.3: an artist surface resolves portrait → generated and never event
      // artwork. `SlotSource` makes the wrong call a compile error; this is its
      // runtime witness, on a page whose shows do have their own imagery.
      const { container } = render(<ArtistPageContent data={withShows} />)
      const band = container.querySelector('[data-testid="hero-band"]')

      expect(band?.querySelector('img')).toBeNull()
      expect(band?.querySelector('svg')).not.toBeNull()
    })

    it('keeps the desktop rail sticky and hands it the band panel', () => {
      setViewport(true)
      const { container } = render(<ArtistPageContent data={withPhoto} />)

      const rail = container.querySelector('.ap-rail')
      expect(rail).not.toBeNull()
      expect(rail?.querySelector('img')?.getAttribute('src')).toBe(photo)
      // `.ap-rail` carries `position: sticky` in globals.css; the band must not
      // render alongside it or the page would show two portraits.
      expect(container.querySelector('[data-testid="hero-band"]')).toBeNull()
    })
  })
})
