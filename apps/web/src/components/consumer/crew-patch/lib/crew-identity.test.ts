import { describe, it, expect } from 'vitest'

import {
  crewHash,
  crewIdentity,
  nextPatchSalt,
  CREW_CHORDS,
  CREW_WEAVES,
  CREW_SIGILS,
  CREW_GROUNDS,
} from './crew-identity'

describe('crewHash', () => {
  it('is a deterministic FNV-1a over the "crew:<id>:<salt>" string', () => {
    expect(crewHash('thursdays', 0)).toBe(crewHash('thursdays', 0))
    // FNV-1a 32-bit of the literal input string, computed independently.
    const input = 'crew:thursdays:0'
    let expected = 0x811c9dc5 >>> 0
    for (let i = 0; i < input.length; i++) {
      expected = (expected ^ input.charCodeAt(i)) >>> 0
      expected = Math.imul(expected, 0x01000193) >>> 0
    }
    expect(crewHash('thursdays', 0)).toBe(expected)
  })

  it('stays a uint32', () => {
    for (let i = 0; i < 200; i++) {
      const hash = crewHash(`crew-${i}`, i)
      expect(Number.isInteger(hash)).toBe(true)
      expect(hash).toBeGreaterThanOrEqual(0)
      expect(hash).toBeLessThanOrEqual(0xffffffff)
    }
  })

  it('defaults the salt to 0 and treats an empty id as ""', () => {
    expect(crewHash('thursdays')).toBe(crewHash('thursdays', 0))
    expect(crewHash('')).toBe(crewHash('', 0))
  })

  it('changes when the salt changes', () => {
    expect(crewHash('thursdays', 1)).not.toBe(crewHash('thursdays', 0))
  })
})

describe('crewIdentity', () => {
  it('reads each layer from an independent bit slice', () => {
    const hash = crewHash('thursdays', 0)
    const id = crewIdentity('thursdays', 0)
    expect(id.chord).toBe(CREW_CHORDS[hash % CREW_CHORDS.length])
    expect(id.weave).toBe(CREW_WEAVES[(hash >>> 5) % CREW_WEAVES.length])
    expect(id.sigil).toBe(CREW_SIGILS[(hash >>> 11) % CREW_SIGILS.length])
    expect(id.ground).toBe(CREW_GROUNDS[(hash >>> 17) % CREW_GROUNDS.length])
    expect(id.spin).toBe(((hash >>> 21) % 6) * 60)
  })

  it('spans a wide slice of the 300-variant space', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 600; i++) {
      const id = crewIdentity(`crew-${i}`, 0)
      seen.add(`${id.chord}|${id.weave}|${id.sigil}|${id.ground}|${id.spin}`)
    }
    expect(seen.size).toBeGreaterThan(200)
  })

  it('only ever emits known layer ids', () => {
    for (let i = 0; i < 300; i++) {
      const id = crewIdentity(`crew-${i}`, i)
      expect(CREW_CHORDS).toContain(id.chord)
      expect(CREW_WEAVES).toContain(id.weave)
      expect(CREW_SIGILS).toContain(id.sigil)
      expect(CREW_GROUNDS).toContain(id.ground)
      expect(id.spin % 60).toBe(0)
      expect(id.spin).toBeLessThan(360)
    }
  })
})

/** Independent restatement of G2 + G3, used to spec-check nextPatchSalt. */
const isDistinctEnough = (
  crewId: string,
  currentSalt: number,
  candidateSalt: number,
  maxShared: number,
): boolean => {
  const current = crewIdentity(crewId, currentSalt)
  const candidate = crewIdentity(crewId, candidateSalt)
  if (candidate.weave === current.weave) return false
  const shared = [
    candidate.sigil === current.sigil,
    candidate.ground === current.ground,
    candidate.chord === current.chord,
  ].filter(Boolean).length
  return shared <= maxShared
}

describe('nextPatchSalt', () => {
  it('returns the first salt in the 60-wide window that clears both rules', () => {
    for (let i = 0; i < 60; i++) {
      const crewId = `crew-${i}`
      let firstOk: number | null = null
      for (let salt = 1; salt <= 60; salt++) {
        if (isDistinctEnough(crewId, 0, salt, 1)) {
          firstOk = salt
          break
        }
      }
      expect(nextPatchSalt(crewId, 0)).toBe(firstOk ?? 1)
    }
  })

  it('always moves the weave when any candidate can', () => {
    for (let i = 0; i < 60; i++) {
      const crewId = `crew-${i}`
      const next = nextPatchSalt(crewId, 0)
      expect(crewIdentity(crewId, next).weave).not.toBe(
        crewIdentity(crewId, 0).weave,
      )
    }
  })

  it('advances past the current salt', () => {
    expect(nextPatchSalt('thursdays', 4)).toBeGreaterThan(4)
  })

  it('honours a wider maxShared', () => {
    const next = nextPatchSalt('thursdays', 0, 2)
    expect(isDistinctEnough('thursdays', 0, next, 2)).toBe(true)
  })

  it('defaults the current salt to 0', () => {
    expect(nextPatchSalt('thursdays')).toBe(nextPatchSalt('thursdays', 0))
  })
})
