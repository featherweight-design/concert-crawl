import { describe, it, expect } from 'vitest'
import { deriveObservedAt } from './observed-at.js'

const createdAt = new Date('2026-08-01T00:00:00Z')

describe('deriveObservedAt', () => {
  it('falls back to createdAt when there is no sighting', () => {
    expect(deriveObservedAt(null, createdAt)).toEqual(createdAt)
  })

  it('takes lastSeenAt when it is later', () => {
    const lastSeenAt = new Date('2026-08-02T00:00:00Z')
    expect(deriveObservedAt(lastSeenAt, createdAt)).toEqual(lastSeenAt)
  })

  // The regression test for the coalesce-vs-max bug: a sighting stamped behind
  // createdAt (clock skew, a repaired row) must not move freshness backwards.
  it('keeps createdAt when lastSeenAt is earlier', () => {
    const lastSeenAt = new Date('2026-07-30T00:00:00Z')
    expect(deriveObservedAt(lastSeenAt, createdAt)).toEqual(createdAt)
  })
})
