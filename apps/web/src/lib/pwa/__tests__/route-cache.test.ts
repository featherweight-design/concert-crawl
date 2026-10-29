import { describe, it, expect } from 'vitest'
import { isPublicCacheableApi, isPublicCacheableDocument } from '../route-cache'

const url = (path: string) => new URL(`https://api.concertcrawl.app${path}`)

const page = (path: string) => new URL(`https://concertcrawl.app${path}`)

// UUID-shaped id to match the API contract for /v1/events/:id.
const EVENT_ID = '3f8c1e2a-9b4d-4c6e-8a71-2d5f0b9e1c34'

describe('isPublicCacheableApi', () => {
  it('allows public event + venue reads', () => {
    expect(isPublicCacheableApi(url('/v1/events'))).toBe(true)
    expect(isPublicCacheableApi(url('/v1/events/genres'))).toBe(true)
    expect(isPublicCacheableApi(url('/v1/events/availability'))).toBe(true)
    expect(isPublicCacheableApi(url(`/v1/events/${EVENT_ID}`))).toBe(true)
    expect(isPublicCacheableApi(url(`/v1/events/${EVENT_ID}/related`))).toBe(
      true,
    )
    expect(isPublicCacheableApi(url('/v1/venues'))).toBe(true)
    expect(isPublicCacheableApi(url('/v1/venues/ogden-theatre'))).toBe(true)
  })

  it('never caches user-specific subresources under a public prefix', () => {
    expect(
      isPublicCacheableApi(url(`/v1/events/${EVENT_ID}/price-submissions`)),
    ).toBe(false)
    expect(isPublicCacheableApi(url(`/v1/events/${EVENT_ID}/reports`))).toBe(
      false,
    )
    expect(isPublicCacheableApi(url(`/v1/events/${EVENT_ID}/watch`))).toBe(
      false,
    )
  })

  it('does not cache non-UUID single-segment event routes', () => {
    expect(isPublicCacheableApi(url('/v1/events/search'))).toBe(false)
    expect(isPublicCacheableApi(url('/v1/events/recommended'))).toBe(false)
    expect(isPublicCacheableApi(url('/v1/events/not-a-uuid/related'))).toBe(
      false,
    )
  })

  it('never caches authenticated or admin routes', () => {
    expect(isPublicCacheableApi(url('/v1/me'))).toBe(false)
    expect(isPublicCacheableApi(url('/v1/notifications'))).toBe(false)
    expect(isPublicCacheableApi(url('/v1/billing/checkout-session'))).toBe(
      false,
    )
    expect(isPublicCacheableApi(url('/v1/admin/feedback'))).toBe(false)
  })

  it('does not treat a prefix collision as a match', () => {
    expect(isPublicCacheableApi(url('/v1/events-archive'))).toBe(false)
    expect(isPublicCacheableApi(url('/v1/venuescan'))).toBe(false)
  })

  it('defaults unknown routes to network-only', () => {
    expect(isPublicCacheableApi(url('/v1/something-new'))).toBe(false)
  })
})

// The service worker used to cache the HTML and RSC payload of every page it
// saw. A gated route cached while signed in was then replayed from disk to a
// signed-out visitor, showing app content the middleware would have redirected.
// This allowlist has to stay a subset of what proxy.ts lets through.
describe('isPublicCacheableDocument', () => {
  it('caches the routes that are public in either launch mode', () => {
    for (const launched of [false, true]) {
      expect(isPublicCacheableDocument(page('/'), launched)).toBe(true)
      expect(isPublicCacheableDocument(page('/legal/terms'), launched)).toBe(
        true,
      )
      expect(isPublicCacheableDocument(page('/changelog'), launched)).toBe(true)
    }
  })

  // Reached from Serwist's precache when a navigation fails, never from this
  // list. Middleware gates it like any other route, so caching it here would
  // break the subset invariant for no gain.
  it('does not cache the offline fallback', () => {
    for (const launched of [false, true]) {
      expect(isPublicCacheableDocument(page('/~offline'), launched)).toBe(false)
    }
  })

  it('withholds the browse verticals until launch', () => {
    for (const path of [
      '/events',
      '/events/upcoming',
      '/venues',
      '/venues/ogden-theatre',
      '/artists/phoebe-bridgers',
      '/e/abc123',
    ]) {
      expect(isPublicCacheableDocument(page(path), false)).toBe(false)
      expect(isPublicCacheableDocument(page(path), true)).toBe(true)
    }
  })

  it('never caches a route that renders someone specific', () => {
    for (const launched of [false, true]) {
      for (const path of [
        '/me',
        '/me/settings',
        '/admin',
        '/admin/events',
        '/watching',
        '/history',
        '/crews',
        '/crew/join/token',
      ]) {
        expect(isPublicCacheableDocument(page(path), launched)).toBe(false)
      }
    }
  })

  // A stale sign-in shell is half of the blank-screen bug: the page renders
  // from cache, Clerk's script never arrives, and there is nothing on screen.
  it('never caches an auth surface, even though sign-in is always public', () => {
    for (const launched of [false, true]) {
      expect(isPublicCacheableDocument(page('/sign-in'), launched)).toBe(false)
      expect(isPublicCacheableDocument(page('/sign-up'), launched)).toBe(false)
      expect(isPublicCacheableDocument(page('/auth/code'), launched)).toBe(
        false,
      )
      expect(isPublicCacheableDocument(page('/onboarding'), launched)).toBe(
        false,
      )
    }
  })

  it('does not treat a prefix collision as a match', () => {
    expect(isPublicCacheableDocument(page('/events-archive'), true)).toBe(false)
    expect(isPublicCacheableDocument(page('/legalese'), true)).toBe(false)
    expect(isPublicCacheableDocument(page('/eat'), true)).toBe(false)
  })

  it('defaults unknown routes to network-only', () => {
    expect(isPublicCacheableDocument(page('/something-new'), true)).toBe(false)
  })
})
