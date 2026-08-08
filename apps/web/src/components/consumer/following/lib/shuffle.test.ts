// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { shuffleWithSeed, readSessionSeed } from './shuffle'
import { SHELF_SHUFFLE_SEED_KEY } from '../definitions/constants'

const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

describe('shuffleWithSeed', () => {
  it('is deterministic for a seed', () => {
    expect(shuffleWithSeed(items, 1234)).toEqual(shuffleWithSeed(items, 1234))
  })

  it('keeps every element exactly once', () => {
    expect(shuffleWithSeed(items, 99).slice().sort()).toEqual(
      items.slice().sort(),
    )
  })

  it('never mutates the input', () => {
    const source = items.slice()
    shuffleWithSeed(source, 7)
    expect(source).toEqual(items)
  })

  it('different seeds reorder differently', () => {
    expect(shuffleWithSeed(items, 1)).not.toEqual(shuffleWithSeed(items, 2))
  })

  it('handles empty and single-item lists', () => {
    expect(shuffleWithSeed([], 5)).toEqual([])
    expect(shuffleWithSeed(['only'], 5)).toEqual(['only'])
  })
})

describe('readSessionSeed', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mints a seed and holds it for the tab', () => {
    const first = readSessionSeed()
    expect(first).not.toBeNull()
    expect(readSessionSeed()).toBe(first)
  })

  it('ignores a non-numeric stored value by minting a fresh one', () => {
    window.sessionStorage.setItem(SHELF_SHUFFLE_SEED_KEY, 'not-a-number')
    const seed = readSessionSeed()
    expect(seed).not.toBeNull()
    expect(Number.isFinite(seed)).toBe(true)
  })

  // Safari private mode throws on ACCESS, not just on write, so the read is
  // what has to be defended — a throw here would blank the whole shelf.
  it('returns null when storage throws', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(readSessionSeed()).toBeNull()
  })
})
