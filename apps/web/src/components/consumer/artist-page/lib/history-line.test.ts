import { describe, expect, it } from 'vitest'

import { CRAWL_SINCE } from '../definitions/constants'

import { historyLine, joinList } from './history-line'

describe('joinList', () => {
  it('handles every arity', () => {
    expect(joinList([])).toBe('')
    expect(joinList(['Hi-Dive'])).toBe('Hi-Dive')
    expect(joinList(['Hi-Dive', 'Lost Lake'])).toBe('Hi-Dive & Lost Lake')
    expect(joinList(['Hi-Dive', 'Lost Lake', 'Globe Hall'])).toBe(
      'Hi-Dive, Lost Lake & Globe Hall',
    )
  })
})

describe('historyLine', () => {
  it('uses the zero phrasing when we have never caught them', () => {
    expect(historyLine({ count: 0, venues: [] })).toContain(
      "First time we've caught them",
    )
    expect(historyLine({ count: 0, venues: [] })).toContain(CRAWL_SINCE)
  })

  it('falls back to the zero phrasing when a count of 1 has no venue', () => {
    // Guards against emitting "We've caught them once — once."
    expect(historyLine({ count: 1, venues: [] })).toContain(
      "First time we've caught them",
    )
  })

  it('names the single venue', () => {
    expect(historyLine({ count: 1, venues: ['Mission Ballroom'] })).toBe(
      `We've caught them once: Mission Ballroom. That's everything since ${CRAWL_SINCE}, which is as far back as our map goes.`,
    )
  })

  it('joins the venue list for many shows', () => {
    expect(
      historyLine({
        count: 4,
        venues: ['Larimer Lounge', 'Globe Hall', 'the Bluebird'],
      }),
    ).toBe(
      `4 shows on our map: Larimer Lounge, Globe Hall & the Bluebird. That's since ${CRAWL_SINCE}; anything earlier they played, we missed.`,
    )
  })

  it('accepts an overridden crawl window', () => {
    expect(historyLine({ count: 0, venues: [] }, 'January 2020')).toContain(
      'January 2020',
    )
  })
})
