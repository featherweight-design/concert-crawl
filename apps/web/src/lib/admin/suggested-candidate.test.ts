import { describe, it, expect } from 'vitest'
import {
  formatDominanceRatio,
  SUGGESTION_MIN_RATIO,
  suggestDominantCandidate,
} from './suggested-candidate'

describe('suggestDominantCandidate (#1525)', () => {
  it('suggests the leader when it clears the ratio', () => {
    expect(
      suggestDominantCandidate([
        { id: 'quiet', popularity: 12 },
        { id: 'loud', popularity: 60 },
      ]),
    ).toEqual({ candidateId: 'loud', ratio: 5 })
  })

  it('ranks across the whole list, not just the first two', () => {
    expect(
      suggestDominantCandidate([
        { id: 'first', popularity: 8 },
        { id: 'second', popularity: 4 },
        { id: 'third', popularity: 70 },
      ]),
    ).toEqual({ candidateId: 'third', ratio: 70 / 8 })
  })

  it('stays silent when the top two sit in the same band', () => {
    expect(
      suggestDominantCandidate([
        { id: 'one', popularity: 60 },
        { id: 'two', popularity: 40 },
      ]),
    ).toBeNull()
  })

  it('treats the threshold itself as dominant', () => {
    expect(
      suggestDominantCandidate([
        { id: 'one', popularity: 20 * SUGGESTION_MIN_RATIO },
        { id: 'two', popularity: 20 },
      ]),
    ).toEqual({ candidateId: 'one', ratio: SUGGESTION_MIN_RATIO })
  })

  it('reports a null ratio when the runner-up scores zero', () => {
    expect(
      suggestDominantCandidate([
        { id: 'known', popularity: 31 },
        { id: 'unheard', popularity: 0 },
      ]),
    ).toEqual({ candidateId: 'known', ratio: null })
  })

  it('stays silent when nobody has any popularity', () => {
    expect(
      suggestDominantCandidate([
        { id: 'one', popularity: 0 },
        { id: 'two', popularity: 0 },
      ]),
    ).toBeNull()
  })

  // An unknown could outrank the leader, so it disqualifies the comparison
  // rather than being ranked last.
  it('stays silent when any candidate has an unknown popularity', () => {
    expect(
      suggestDominantCandidate([
        { id: 'known', popularity: 90 },
        { id: 'unknown', popularity: null },
      ]),
    ).toBeNull()
  })

  it('stays silent on a list with nothing to disambiguate', () => {
    expect(suggestDominantCandidate([])).toBeNull()
    expect(
      suggestDominantCandidate([{ id: 'only', popularity: 55 }]),
    ).toBeNull()
  })
})

describe('formatDominanceRatio', () => {
  it('drops a trailing zero and rounds the rest', () => {
    expect(formatDominanceRatio(5)).toBe('5')
    expect(formatDominanceRatio(70 / 8)).toBe('8.8')
    expect(formatDominanceRatio(2.04)).toBe('2')
  })
})
