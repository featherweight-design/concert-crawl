// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { AppHeader } from './AppHeader'
import { SearchPaletteContext } from '../search-palette/search-palette-context'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

let mockAuth: { isSignedIn: boolean; isLoaded: boolean } = {
  isSignedIn: false,
  isLoaded: true,
}

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => mockAuth,
}))

const pathname = { current: '/events' }

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}))

vi.mock('../user-menu', () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}))

// Hoisted: `vi.mock` runs before module-scope consts, so the spy has to be
// created inside the hoisted block to be visible to the factory.
const { useFeatureFlag } = vi.hoisted(() => ({ useFeatureFlag: vi.fn() }))
vi.mock('@/lib/queries/use-feature-flags', () => ({ useFeatureFlag }))

const mockFeatureFlag = (key: string, enabled: boolean) =>
  useFeatureFlag.mockImplementation((requested: string) => ({
    isLoading: false,
    enabled: requested === key ? enabled : true,
  }))

beforeEach(() => {
  mockAuth = { isSignedIn: false, isLoaded: true }
  pathname.current = '/events'
  // Flags on by default, so every pre-flag assertion below keeps asserting the
  // behaviour it was written for.
  mockFeatureFlag('crews', true)
})

afterEach(cleanup)

describe('AppHeader', () => {
  it('renders without rightSlots when none provided', () => {
    render(<AppHeader />)
    expect(screen.getAllByLabelText(/search/i).length).toBeGreaterThan(0)
  })

  it('renders provided rightSlots into the top-right chrome', () => {
    render(
      <AppHeader
        rightSlots={
          <button type="button" data-testid="install-slot">
            Install
          </button>
        }
      />,
    )
    // The slot appears in BOTH mobile and desktop layouts so it's reachable
    // regardless of viewport — the responsive display: none rules hide the
    // other bar, not the absence of the slot.
    expect(screen.getAllByTestId('install-slot').length).toBeGreaterThan(0)
  })
})

// The palette moved out of the header so the page body could open the same
// one. The header's own triggers have to keep working through the provider.
describe('AppHeader search triggers', () => {
  it('asks the provider to open, at both breakpoints', () => {
    const open = vi.fn()
    render(
      <SearchPaletteContext.Provider value={{ open }}>
        <AppHeader />
      </SearchPaletteContext.Provider>,
    )

    const triggers = screen.getAllByLabelText(/search/i)
    expect(triggers.length).toBeGreaterThan(1)
    for (const trigger of triggers) fireEvent.click(trigger)
    expect(open).toHaveBeenCalledTimes(triggers.length)
  })

  it('renders without a provider rather than throwing', () => {
    render(<AppHeader />)
    const [trigger] = screen.getAllByLabelText(/search/i)
    if (trigger === undefined) throw new Error('no search trigger')
    fireEvent.click(trigger)
  })
})

describe('AppHeader — signed-out auth affordances (#794)', () => {
  it('renders the Sign up pill and the Sign in link for a signed-out visitor', () => {
    render(<AppHeader />)
    const signUp = screen.getAllByRole('link', { name: /^sign up$/i })
    expect(signUp.length).toBeGreaterThan(0)
    expect(signUp[0]?.getAttribute('href')).toBe('/sign-up')
    const signIn = screen.getAllByRole('link', { name: /^sign in$/i })
    expect(signIn.length).toBeGreaterThan(0)
    expect(signIn[0]?.getAttribute('href')).toBe('/sign-in')
  })

  it('renders neither for a signed-in visitor', () => {
    mockAuth = { isSignedIn: true, isLoaded: true }
    render(<AppHeader />)
    expect(screen.queryByRole('link', { name: /^sign up$/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /^sign in$/i })).toBeNull()
  })

  it('exposes both affordances at both breakpoints — only the position moves', () => {
    // The in-row Sign in is `hidden sm:inline-flex` and the rail that carries
    // it at 320 is `sm:hidden`, so exactly one of the two is visible at any
    // width. Both must exist in the tree.
    render(<AppHeader />)
    const signIn = screen.getAllByRole('link', { name: /^sign in$/i })
    const inRow = signIn.filter((el) => el.className.includes('sm:inline-flex'))
    const railed = signIn.filter((el) => el.className.includes('min-h-[44px]'))
    expect(inRow.length).toBeGreaterThan(0)
    expect(railed.length).toBeGreaterThan(0)
  })

  it('keeps the account menu out of the mobile bar', () => {
    // Slot 4 of the bottom nav is the only account-menu entry on mobile; a
    // second trigger in the header duplicates it a thumb's width away.
    render(<AppHeader />)
    // Named rather than by test id: the point is that no control in the mobile
    // bar opens the account menu, not that one particular component is gone.
    const labels = CONSUMER_COPY.userMenu.ariaLabels
    for (const name of [labels.accountMenu, labels.accountMenuSignedOut]) {
      expect(screen.queryByRole('button', { name })).toBeNull()
    }
  })

  it('lights "My shows" on both of the routes it owns', () => {
    for (const route of ['/watching', '/history']) {
      pathname.current = route
      const { unmount } = render(<AppHeader />)
      expect(
        screen.getByRole('link', { name: 'My shows' }).className,
        route,
      ).toContain('font-bold')
      unmount()
    }
  })

  it('leaves the nav tabs alone', () => {
    render(<AppHeader />)
    for (const [label, href] of [
      ['Browse', '/events'],
      ['Venues', '/venues'],
      ['My shows', '/watching'],
    ] as const) {
      expect(
        screen.getByRole('link', { name: label }).getAttribute('href'),
      ).toBe(href)
    }
  })
})

describe('AppHeader crews tab (#1226)', () => {
  it('carries the same crews destination as the mobile bar', () => {
    render(<AppHeader />)
    expect(
      screen.getByRole('link', { name: 'Crews' }).getAttribute('href'),
    ).toBe('/crews')
  })

  it('marks the active tab as the current page', () => {
    pathname.current = '/crews'
    render(<AppHeader />)
    expect(
      screen.getByRole('link', { name: 'Crews' }).getAttribute('aria-current'),
    ).toBe('page')
    expect(
      screen.getByRole('link', { name: 'Browse' }).getAttribute('aria-current'),
    ).toBeNull()
  })

  it('drops the crews link when the flag is off', () => {
    mockFeatureFlag('crews', false)
    render(<AppHeader />)
    expect(screen.queryByRole('link', { name: 'Crews' })).toBeNull()
  })

  it('renders the crews link when the flag is on', () => {
    mockFeatureFlag('crews', true)
    render(<AppHeader />)
    expect(
      screen.getByRole('link', { name: 'Crews' }).getAttribute('href'),
    ).toBe('/crews')
  })

  it('marks My shows current on a /history sub-route', () => {
    pathname.current = '/history'
    render(<AppHeader />)
    expect(
      screen
        .getByRole('link', { name: 'My shows' })
        .getAttribute('aria-current'),
    ).toBe('page')
  })
})
