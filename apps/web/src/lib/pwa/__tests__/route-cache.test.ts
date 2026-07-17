import { describe, it, expect } from 'vitest'
import { isPublicCacheableApi } from '../route-cache'

const url = (path: string) => new URL(`https://api.concertcrawl.app${path}`)

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
