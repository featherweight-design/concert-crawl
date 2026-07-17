import { describe, it, expect } from 'vitest'
import { isPublicCacheableApi } from '../route-cache'

const url = (path: string) => new URL(`https://api.concertcrawl.app${path}`)

describe('isPublicCacheableApi', () => {
  it('allows public event + venue reads', () => {
    expect(isPublicCacheableApi(url('/v1/events'))).toBe(true)
    expect(isPublicCacheableApi(url('/v1/events/abc-123'))).toBe(true)
    expect(isPublicCacheableApi(url('/v1/venues'))).toBe(true)
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
