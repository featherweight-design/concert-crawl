import { describe, expect, it, vi } from 'vitest'

const { fanoutWatchNotification } = vi.hoisted(() => ({
  fanoutWatchNotification: vi.fn().mockResolvedValue({
    watchersNotified: 0,
    pushDelivered: 0,
  }),
}))

vi.mock('@concert-crawl/push', () => ({ fanoutWatchNotification }))
vi.mock('@concert-crawl/db', () => ({
  db: { name: 'db' },
  events: { name: 'events' },
  notifications: { name: 'notifications' },
  userEvents: { name: 'userEvents' },
  venues: { name: 'venues' },
}))

import {
  detectPriceDrop,
  fanoutPriceDrop,
  isStrictlyLowerNumeric,
} from './price-drop.js'

describe('isStrictlyLowerNumeric', () => {
  it('is true only for a strictly lower candidate', () => {
    expect(isStrictlyLowerNumeric('32.00', '48.00')).toBe(true)
    expect(isStrictlyLowerNumeric('47.99', '48')).toBe(true)
  })

  it('is false for equal prices, including differently formatted ones', () => {
    expect(isStrictlyLowerNumeric('35', '35.00')).toBe(false)
  })

  it('is false for a higher candidate', () => {
    expect(isStrictlyLowerNumeric('40.00', '30.00')).toBe(false)
  })

  it('is false when either side is unparseable', () => {
    expect(isStrictlyLowerNumeric('free', '30.00')).toBe(false)
    expect(isStrictlyLowerNumeric('20.00', '')).toBe(false)
  })
})

describe('detectPriceDrop', () => {
  it('returns the drop when the new price is strictly lower', () => {
    expect(detectPriceDrop('evt', '48.00', '32.00')).toEqual({
      eventId: 'evt',
      oldPriceMin: '48.00',
      newPriceMin: '32.00',
    })
  })

  it('returns undefined when there was no previous price', () => {
    expect(detectPriceDrop('evt', null, '32.00')).toBeUndefined()
    expect(detectPriceDrop('evt', undefined, '32.00')).toBeUndefined()
  })

  it('returns undefined for an equal or higher price', () => {
    expect(detectPriceDrop('evt', '32.00', '32.00')).toBeUndefined()
    expect(detectPriceDrop('evt', '32.00', '40.00')).toBeUndefined()
  })
})

describe('fanoutPriceDrop', () => {
  it('fans out watch.pricedrop with the old and new minimums', async () => {
    await fanoutPriceDrop({
      eventId: 'evt',
      oldPriceMin: '48.00',
      newPriceMin: '32.00',
    })
    expect(fanoutWatchNotification).toHaveBeenCalledTimes(1)
    expect(fanoutWatchNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        db: { name: 'db' },
        notifications: { name: 'notifications' },
        userEvents: { name: 'userEvents' },
      }),
      {
        eventId: 'evt',
        category: 'watch.pricedrop',
        pricedrop: { newPriceMin: '32.00', oldPriceMin: '48.00' },
      },
    )
  })
})
