import { describe, it, expect } from 'vitest'
import { hashStr, mintMeta, posterFingerprint, shareCacheKey } from '../mint'

const EVENT = { id: 'evt-1', state: 'going' }
const USER = { id: 'usr-1', handle: 'huey' }

describe('hashStr', () => {
  it('is FNV-1a and returns eight lowercase hex chars', () => {
    expect(hashStr('')).toBe('811c9dc5')
    expect(hashStr('a')).toHaveLength(8)
    expect(hashStr('a')).toMatch(/^[0-9a-f]{8}$/)
  })

  it('is stable and input-sensitive', () => {
    expect(hashStr('abc')).toBe(hashStr('abc'))
    expect(hashStr('abc')).not.toBe(hashStr('abd'))
  })
})

describe('mintMeta', () => {
  it('produces a stable eight-char uppercase hex contentHash', () => {
    const first = mintMeta(EVENT, USER)
    const second = mintMeta(EVENT, USER)
    expect(first.contentHash).toBe(second.contentHash)
    expect(first.contentHash).toMatch(/^[0-9A-F]{8}$/)
  })

  it.each([
    ['event id', { ...EVENT, id: 'evt-2' }, USER],
    ['event state', { ...EVENT, state: 'soldout' }, USER],
    ['user id', EVENT, { ...USER, id: 'usr-2' }],
  ])('changes contentHash when %s changes', (_label, event, user) => {
    expect(mintMeta(event, user).contentHash).not.toBe(
      mintMeta(EVENT, USER).contentHash,
    )
  })

  it('ignores the handle — it is not part of the content', () => {
    expect(
      mintMeta(EVENT, { ...USER, handle: 'someone-else' }).contentHash,
    ).toBe(mintMeta(EVENT, USER).contentHash)
  })

  it('zero-pads the serial to four', () => {
    expect(mintMeta(EVENT, USER).serial).toBe('0001')
    expect(mintMeta(EVENT, USER, 42).serial).toBe('0042')
    expect(mintMeta(EVENT, USER, 12345).serial).toBe('12345')
  })

  it('returns null `by` for an anonymous caller', () => {
    expect(mintMeta(EVENT, { id: 'anon' }).by).toBeNull()
    expect(mintMeta(EVENT, { id: 'anon', handle: null }).by).toBeNull()
  })

  it('returns an ISO-8601 mintedAt', () => {
    expect(mintMeta(EVENT, USER).mintedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    )
  })

  it('keeps serial and mintedAt out of the cache key — they are metadata only', () => {
    // README §3 dropped both from the drawn card. Nothing downstream may key
    // off them, or every render becomes a cache miss.
    const meta = mintMeta(EVENT, USER, 7)
    const key = shareCacheKey(EVENT.id, USER.id, meta.contentHash)
    expect(key).not.toContain(meta.serial)
    expect(key).not.toContain(meta.mintedAt)
  })
})

describe('shareCacheKey', () => {
  it('is stable and varies with every component', () => {
    expect(shareCacheKey('ev', 'us', 'AABBCCDD')).toBe('share:ev:us:AABBCCDD')
    expect(shareCacheKey('ev', 'us', 'AABBCCDD')).not.toBe(
      shareCacheKey('ev', 'us', 'AABBCCDE'),
    )
  })
})

describe('posterFingerprint', () => {
  it('is stable for identical field lists', () => {
    expect(posterFingerprint(['A', null, 'B'])).toBe(
      posterFingerprint(['A', null, 'B']),
    )
  })

  // A delimiter-joined encoding collides here, and the collision is not
  // theoretical: venue names contain spaces.
  it('does not collide when a field boundary shifts', () => {
    expect(posterFingerprint(['A B', 'C'])).not.toBe(
      posterFingerprint(['A', 'B C']),
    )
  })

  it('distinguishes an absent field from an empty one', () => {
    expect(posterFingerprint([null])).not.toBe(posterFingerprint(['']))
  })
})
