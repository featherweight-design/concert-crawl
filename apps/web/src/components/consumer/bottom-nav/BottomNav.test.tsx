// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { BottomNav } from './BottomNav'

let mockAuth: {
  isSignedIn: boolean
  isLoaded: boolean
  getToken: () => Promise<string | null>
} = {
  isSignedIn: false,
  isLoaded: true,
  getToken: async () => null,
}

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => mockAuth,
}))

const pathname = { current: '/events' }

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}))

vi.mock('@/lib/users', () => ({
  fetchMe: async () => ({ handle: 'hugh', avatarColor: 'signal' }),
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
  mockAuth = { isSignedIn: false, isLoaded: true, getToken: async () => null }
  pathname.current = '/events'
  // Flags on by default, so every pre-flag assertion below keeps asserting the
  // behaviour it was written for.
  mockFeatureFlag('crews', true)
})

afterEach(cleanup)

describe('BottomNav slot 4 (#794)', () => {
  // Slot 4 used to link straight to /me when signed in, which skipped past
  // every other destination the account menu holds. It's a menu trigger in
  // both auth states now; Settings is one row inside the menu.
  it('renders slot 4 as a menu trigger when signed in', () => {
    mockAuth = {
      isSignedIn: true,
      isLoaded: true,
      getToken: async () => 'token',
    }
    render(<BottomNav />)

    expect(screen.queryByRole('link', { name: /account menu/i })).toBeNull()
    const trigger = screen.getByRole('button', { name: 'Account menu' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('renders slot 4 as a menu trigger when signed out', () => {
    render(<BottomNav />)
    const trigger = screen.getByRole('button', {
      name: /account menu: sign up or sign in/i,
    })
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('holds a 56x44 target on the 26px disc', () => {
    render(<BottomNav />)
    const trigger = screen.getByRole('button', {
      name: /account menu: sign up or sign in/i,
    })
    expect(trigger.style.width).toBe('56px')
    expect(trigger.style.minHeight).toBe('44px')
  })

  it('never renders the loading skeleton for an anonymous visitor', () => {
    render(<BottomNav />)
    // The skeleton is the signed-in path's pre-fetch state; an anonymous
    // visitor lands on the resolved disc and never transits it.
    expect(screen.queryByTestId('anon-disc')).not.toBeNull()
    expect(screen.queryByTestId('me-avatar-skeleton')).toBeNull()
  })

  it('lights "my shows" on both of the routes it owns', () => {
    for (const route of ['/watching', '/history']) {
      pathname.current = route
      const { unmount } = render(<BottomNav />)
      expect(
        screen.getByRole('link', { name: 'my shows' }).style.color,
        route,
      ).toBe('var(--signal)')
      unmount()
    }
  })

  it('leaves the three static tabs untouched', () => {
    render(<BottomNav />)
    for (const [label, href] of [
      ['browse', '/events'],
      ['venues', '/venues'],
      ['my shows', '/watching'],
    ] as const) {
      expect(
        screen.getByRole('link', { name: label }).getAttribute('href'),
      ).toBe(href)
    }
  })

  it('keeps the fixed positioning and safe-area height', () => {
    render(<BottomNav />)
    const nav = screen.getByRole('navigation')
    expect(nav.className).toContain('fixed')
    // jsdom's CSS serializer reorders `env()` arguments, so assert on the
    // pieces rather than the literal declaration.
    expect(nav.style.height).toContain('52px')
    expect(nav.style.height).toContain('safe-area-inset-bottom')
  })
})

describe('BottomNav crews slot (#1226)', () => {
  it('renders five destination tabs in the locked order', () => {
    render(<BottomNav />)
    for (const [label, href] of [
      ['browse', '/events'],
      ['venues', '/venues'],
      ['my shows', '/watching'],
      ['crews', '/crews'],
    ] as const) {
      expect(
        screen.getByRole('link', { name: label }).getAttribute('href'),
      ).toBe(href)
    }
  })

  it('fits five slots at a 320px baseline without truncating a label', () => {
    render(<BottomNav />)
    const links = screen.getAllByRole('link')
    // Four links plus the account button. Nothing claims a fixed width, so the
    // bar distributes by flex; each slot only reserves a 56px floor, the same
    // number the account trigger beside it uses.
    expect(links).toHaveLength(4)
    const reserved = links.length * 56 + 56
    expect(reserved).toBeLessThanOrEqual(320)
    for (const link of links) {
      expect(link.style.width).toBe('')
      expect(link.style.minWidth).toBe('56px')
      expect(link.style.minHeight).toBe('44px')
      // A clipped label is what "5 slots at 320" actually risks, so assert the
      // label is neither ellipsised nor wrapped.
      const label = link.querySelector('span')
      expect(label?.className).toContain('whitespace-nowrap')
      expect(label?.className).not.toContain('truncate')
    }
  })

  it('marks the crews tab as the current page on /crews', () => {
    pathname.current = '/crews'
    render(<BottomNav />)
    expect(
      screen.getByRole('link', { name: 'crews' }).getAttribute('aria-current'),
    ).toBe('page')
    expect(
      screen.getByRole('link', { name: 'browse' }).getAttribute('aria-current'),
    ).toBeNull()
  })

  it('drops the crews tab when the flag is off', () => {
    mockFeatureFlag('crews', false)
    render(<BottomNav />)
    expect(screen.queryByRole('link', { name: /crews/i })).toBeNull()
  })

  it('renders the crews tab when the flag is on', () => {
    mockFeatureFlag('crews', true)
    render(<BottomNav />)
    expect(
      screen.getByRole('link', { name: /crews/i }).getAttribute('href'),
    ).toBe('/crews')
  })

  it('keeps the other three tabs when crews is off', () => {
    mockFeatureFlag('crews', false)
    render(<BottomNav />)
    expect(screen.getAllByRole('link')).toHaveLength(3)
  })

  it('does not reuse the Watching eye for crews', () => {
    pathname.current = '/crews'
    render(<BottomNav />)
    const crews = screen.getByRole('link', { name: 'crews' })
    const watching = screen.getByRole('link', { name: 'my shows' })
    expect(crews.querySelector('svg')?.innerHTML).not.toBe(
      watching.querySelector('svg')?.innerHTML,
    )
    expect(crews.querySelectorAll('circle')).toHaveLength(3)
  })
})
