import { describe, expect, it } from 'vitest'
import {
  SHARE_CACHE_CONTROL,
  etagMatches,
  parseShareRequest,
  resolveShareHandle,
} from '@/lib/share/share-request'

const VALID_ID = '11111111-2222-4333-8444-555555555555'

describe('resolveShareHandle', () => {
  it('accepts a plain handle and normalises the leading @', () => {
    expect(resolveShareHandle('hugh')).toBe('@hugh')
    expect(resolveShareHandle('@hugh')).toBe('@hugh')
  })

  it('treats a missing or empty handle as an anonymous share', () => {
    expect(resolveShareHandle(undefined)).toBeNull()
    expect(resolveShareHandle('')).toBeNull()
    expect(resolveShareHandle('@')).toBeNull()
  })

  it('rejects anything that is not a plausible handle', () => {
    // Rendered straight onto the PNG, so the charset is an allowlist rather
    // than an escape pass — there is nothing to escape in a raster.
    expect(resolveShareHandle('hugh hartigan')).toBeNull()
    expect(resolveShareHandle('<script>')).toBeNull()
    expect(resolveShareHandle('a'.repeat(40))).toBeNull()
  })
})

describe('parseShareRequest', () => {
  it('accepts a well-formed request', () => {
    const result = parseShareRequest({
      eventId: VALID_ID,
      ratio: 'square',
      theme: 'jade',
      by: 'hugh',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.eventId).toBe(VALID_ID)
    expect(result.ratio).toBe('square')
    expect(result.theme).toBe('jade')
    expect(result.handle).toBe('@hugh')
  })

  it('rejects a non-UUID event id rather than round-tripping to the API', () => {
    const result = parseShareRequest({ eventId: 'nope', ratio: 'story' })
    expect(result.ok).toBe(false)
  })

  it('rejects an unknown ratio instead of silently falling back', () => {
    // A fallback here would serve a 1080×1920 story for `?ratio=banner` and
    // look like a bug in whatever embedded it.
    const result = parseShareRequest({ eventId: VALID_ID, ratio: 'banner' })
    expect(result.ok).toBe(false)
  })

  it('falls back to the default theme for an unknown theme', () => {
    // A theme is cosmetic — unlike the ratio, guessing is the kinder failure.
    const result = parseShareRequest({
      eventId: VALID_ID,
      ratio: 'story',
      theme: '__proto__',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.theme).toBe('electric')
  })

  it('defaults to an anonymous share when no handle is supplied', () => {
    const result = parseShareRequest({ eventId: VALID_ID, ratio: 'link' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.handle).toBeNull()
  })
})

describe('SHARE_CACHE_CONTROL', () => {
  it('is the locked cache policy', () => {
    expect(SHARE_CACHE_CONTROL).toBe(
      'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    )
  })
})

describe('etagMatches', () => {
  const TAG = '"share:ev:anon:AABBCCDD:story:electric:11223344"'

  it('matches an exact tag', () => {
    expect(etagMatches(TAG, TAG)).toBe(true)
  })

  it('matches a tag inside a comma-separated list', () => {
    expect(etagMatches(`"other", ${TAG}, "another"`, TAG)).toBe(true)
  })

  // A cache in front of us may weaken the tag on the way back.
  it('matches a weak validator', () => {
    expect(etagMatches(`W/${TAG}`, TAG)).toBe(true)
  })

  it('matches the wildcard', () => {
    expect(etagMatches('*', TAG)).toBe(true)
  })

  it('does not match a different tag or a missing header', () => {
    expect(etagMatches('"nope"', TAG)).toBe(false)
    expect(etagMatches(null, TAG)).toBe(false)
  })
})
