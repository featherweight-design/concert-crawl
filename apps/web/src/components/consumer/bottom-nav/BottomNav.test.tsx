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

beforeEach(() => {
  mockAuth = { isSignedIn: false, isLoaded: true, getToken: async () => null }
  pathname.current = '/events'
})

afterEach(cleanup)

describe('BottomNav slot 4 (#794)', () => {
  it('keeps slot 4 as a link to /me when signed in', () => {
    mockAuth = {
      isSignedIn: true,
      isLoaded: true,
      getToken: async () => 'token',
    }
    render(<BottomNav />)
    expect(
      screen.getByRole('link', { name: /profile/i }).getAttribute('href'),
    ).toBe('/me')
  })

  it('renders slot 4 as a menu trigger when signed out', () => {
    render(<BottomNav />)
    const trigger = screen.getByRole('button', {
      name: /account menu — sign up or sign in/i,
    })
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('holds a 56x44 target on the 26px disc', () => {
    render(<BottomNav />)
    const trigger = screen.getByRole('button', {
      name: /account menu — sign up or sign in/i,
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
