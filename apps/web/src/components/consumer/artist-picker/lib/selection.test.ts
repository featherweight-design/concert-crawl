// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  readPicks,
  writePicks,
  clearPicks,
  readStepIndex,
  writeStepIndex,
  STEP_INDEX_KEY,
} from './selection'

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

  // A hand-edited mirror is the boundary this parser exists for. A blank entry
  // would ride into `?genres=`, which the server 400s on, and a duplicate would
  // push the "follow N artists" count past the number of tiles actually ticked.
  it('drops blank entries and duplicates', () => {
    window.sessionStorage.setItem(
      KEY,
      JSON.stringify(['alpha', '  beta ', '', '   ', 'alpha']),
    )
    expect(readPicks(KEY)).toEqual(['alpha', 'beta'])
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

// The step mirror rides beside the picks and carries the same rules, but it
// protects a different moment: a redirect-based payment method returns to
// /onboarding, which mounts at index 0, so without this a visitor who has
// just paid lands on step 1 of 8 holding their selection.
const FLOW_LENGTH = 8

describe('onboarding step mirror', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads back the step it was given', () => {
    writeStepIndex(6)
    expect(readStepIndex(FLOW_LENGTH)).toBe(6)
  })

  it('clears rather than storing step 0, so no key outlives the step', () => {
    writeStepIndex(6)
    writeStepIndex(0)
    expect(window.sessionStorage.getItem(STEP_INDEX_KEY)).toBeNull()
    expect(readStepIndex(FLOW_LENGTH)).toBe(0)
  })

  it('starts at the beginning when nothing is stored', () => {
    expect(readStepIndex(FLOW_LENGTH)).toBe(0)
  })

  // Out of range reads as absent rather than throwing or clamping: shrinking
  // the flow must never strand anyone past its end, and a stored index the
  // flow no longer has is indistinguishable from no mirror at all.
  it.each(['8', '99', '-1', 'not-a-number', '', '3.5'])(
    'falls back to the first step for a stored %s',
    (stored) => {
      window.sessionStorage.setItem(STEP_INDEX_KEY, stored)
      expect(readStepIndex(FLOW_LENGTH)).toBe(0)
    },
  )

  it('keeps the last step of the flow, which is in range', () => {
    writeStepIndex(FLOW_LENGTH - 1)
    expect(readStepIndex(FLOW_LENGTH)).toBe(FLOW_LENGTH - 1)
  })

  it('survives a storage that throws, like Safari private mode', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => writeStepIndex(4)).not.toThrow()

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(readStepIndex(FLOW_LENGTH)).toBe(0)
  })
})
