// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { readPicks, writePicks, clearPicks } from './selection'

const KEY = 'cc.test.picks'

describe('artist picks mirror', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('round-trips a selection', () => {
    writePicks(KEY, ['alpha', 'beta'])
    expect(readPicks(KEY)).toEqual(['alpha', 'beta'])
  })

  it('returns an empty array when nothing is stored', () => {
    expect(readPicks(KEY)).toEqual([])
  })

  it('clears the key rather than storing an empty array', () => {
    writePicks(KEY, ['alpha'])
    writePicks(KEY, [])
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
    expect(readPicks(KEY)).toEqual([])
  })

  it('ignores a stored value that is not an array of strings', () => {
    window.sessionStorage.setItem(KEY, JSON.stringify([1, 2]))
    expect(readPicks(KEY)).toEqual([])
    window.sessionStorage.setItem(KEY, JSON.stringify({ slugs: ['alpha'] }))
    expect(readPicks(KEY)).toEqual([])
  })

  it('ignores corrupt JSON', () => {
    window.sessionStorage.setItem(KEY, 'not json')
    expect(readPicks(KEY)).toEqual([])
  })

  it('clearPicks removes the key', () => {
    writePicks(KEY, ['alpha'])
    clearPicks(KEY)
    expect(readPicks(KEY)).toEqual([])
  })

  it('never throws when storage rejects a write', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => writePicks(KEY, ['alpha'])).not.toThrow()
  })
})
