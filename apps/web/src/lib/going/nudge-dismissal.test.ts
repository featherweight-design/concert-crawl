// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { readNudgeState, markNudge } from './nudge-dismissal'

const KEY = 'cc-nudge-dismissed'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})
afterEach(() => localStorage.clear())

describe('nudge-dismissal', () => {
  it('reports nothing dismissed on a fresh device', () => {
    expect(readNudgeState('ev1')).toBeNull()
  })

  it('remembers each outcome against its own show', () => {
    markNudge('ev1', 'going')
    markNudge('ev2', 'declined')
    markNudge('ev3', 'dismissed')

    expect(readNudgeState('ev1')).toBe('going')
    expect(readNudgeState('ev2')).toBe('declined')
    expect(readNudgeState('ev3')).toBe('dismissed')
  })

  it('keeps earlier answers when a later show is answered', () => {
    markNudge('ev1', 'going')
    markNudge('ev2', 'dismissed')
    expect(readNudgeState('ev1')).toBe('going')
  })

  it('degrades to nothing dismissed when the blob is not JSON', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem(KEY, 'not json{')
    expect(readNudgeState('ev1')).toBeNull()
  })

  it('degrades to nothing dismissed when the blob is the wrong shape', () => {
    localStorage.setItem(KEY, JSON.stringify({ ev1: 'maybe' }))
    expect(readNudgeState('ev1')).toBeNull()
  })

  it('ignores a JSON payload that is not an object', () => {
    localStorage.setItem(KEY, JSON.stringify(['ev1']))
    expect(readNudgeState('ev1')).toBeNull()
  })

  it('does not throw when the write is refused', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() => markNudge('ev1', 'going')).not.toThrow()
    expect(warn).toHaveBeenCalled()
  })
})
