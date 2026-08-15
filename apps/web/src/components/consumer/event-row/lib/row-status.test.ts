import { describe, expect, it } from 'vitest'
import type { EventStatus } from '@concert-crawl/types'
import {
  isStruck,
  resolveRowStatus,
  type RowPriceState,
  type RowStatus,
} from './row-status'

const LIFECYCLES: EventStatus[] = ['upcoming', 'cancelled', 'postponed']
const PRICE_STATES: RowPriceState[] = ['live', 'soldout', 'presale']

describe('resolveRowStatus', () => {
  it('gives the price slot to the lifecycle whatever the price is doing', () => {
    for (const state of PRICE_STATES) {
      expect(resolveRowStatus('cancelled', state)).toBe('cancelled')
      expect(resolveRowStatus('postponed', state)).toBe('postponed')
    }
  })

  // The live bug: production asked `soldout` first and only consulted
  // suppression afterwards, so a cancelled sold-out show read "Sold out".
  it('lets cancelled beat sold out', () => {
    expect(resolveRowStatus('cancelled', 'soldout')).toBe('cancelled')
  })

  it('falls through to the price state on a live show', () => {
    expect(resolveRowStatus('upcoming', 'soldout')).toBe('soldout')
    expect(resolveRowStatus('upcoming', 'presale')).toBe('presale')
    expect(resolveRowStatus('upcoming', 'live')).toBe('price')
  })

  it('resolves every pair to one of the five known outcomes', () => {
    const known: RowStatus[] = [
      'cancelled',
      'postponed',
      'soldout',
      'presale',
      'price',
    ]
    for (const lifecycle of LIFECYCLES) {
      for (const state of PRICE_STATES) {
        expect(known).toContain(resolveRowStatus(lifecycle, state))
      }
    }
  })
})

describe('isStruck', () => {
  // Line 3 is struck for the two lifecycle states and nothing else. Sold out
  // shares the dimmed artwork but is not struck: the night still happens.
  it('strikes the two lifecycle outcomes only', () => {
    expect(isStruck('cancelled')).toBe(true)
    expect(isStruck('postponed')).toBe(true)
    expect(isStruck('soldout')).toBe(false)
    expect(isStruck('presale')).toBe(false)
    expect(isStruck('price')).toBe(false)
  })
})
