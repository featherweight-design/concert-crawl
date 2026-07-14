import { describe, it, expect } from 'vitest'
import { createRng } from './seeded-rng.js'

describe('createRng', () => {
  it('produces identical streams from the same seed', () => {
    const rng1 = createRng(42)
    const rng2 = createRng(42)
    const stream1 = Array.from({ length: 100 }, () => rng1.next())
    const stream2 = Array.from({ length: 100 }, () => rng2.next())
    expect(stream1).toEqual(stream2)
  })
  it('int is inclusive of both bounds', () => {
    const rng = createRng(1)
    const samples = Array.from({ length: 5000 }, () => rng.int(0, 3))
    expect(new Set(samples)).toEqual(new Set([0, 1, 2, 3]))
  })
  it('pick returns an element from the array', () => {
    const rng = createRng(7)
    const arr = ['a', 'b', 'c'] as const
    expect(arr).toContain(rng.pick(arr))
  })
  it('pick throws on an empty array (no silent undefined)', () => {
    // Regression guard: `pick` is typed to return T (not `T | undefined`)
    // — an empty array would otherwise silently return `undefined` and
    // corrupt downstream inserts.
    const rng = createRng(1)
    expect(() => rng.pick([])).toThrow('cannot pick from an empty array')
  })
})
