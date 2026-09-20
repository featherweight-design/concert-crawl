import { describe, expect, it } from 'vitest'
import { deliveryPolicyFor } from './delivery-policy.js'
import {
  PUSH_ELIGIBLE_CATEGORIES,
  UserNotificationCategorySchema,
} from './notification-categories.js'

describe('deliveryPolicyFor', () => {
  it('covers every category in the closed set', () => {
    for (const category of UserNotificationCategorySchema.options) {
      expect(deliveryPolicyFor(category)).toBeDefined()
    }
  })

  // The defect this shipped for: web push must WAKE THE BROWSER for the
  // service worker to run showNotification at all, and a normal-urgency
  // message does not do that for a browser in a restricted standby bucket.
  it('asks every push-eligible category except a price drop to wake the device', () => {
    for (const category of PUSH_ELIGIBLE_CATEGORIES) {
      const expected = category === 'watch.pricedrop' ? 'normal' : 'high'
      expect(deliveryPolicyFor(category).urgency).toBe(expected)
    }
  })

  // The new-show fan-out runs on the 3 AM crawl. High urgency without silence
  // would turn a delivery fix into a 3 AM alarm.
  it('keeps the 3 AM category silent and nothing else', () => {
    const silent = UserNotificationCategorySchema.options.filter(
      (category) => deliveryPolicyFor(category).silent,
    )
    expect(silent).toEqual(['artist.new_show'])
  })

  it('never keeps a message past the day it stops being true', () => {
    // The library default is four weeks, which is how a cancellation could
    // have arrived after the show.
    for (const category of UserNotificationCategorySchema.options) {
      const { ttlSeconds } = deliveryPolicyFor(category)
      expect(ttlSeconds).toBeGreaterThan(0)
      expect(ttlSeconds).toBeLessThanOrEqual(24 * 60 * 60)
    }
  })

  it('drops a time-sensitive watch update before the next night', () => {
    for (const category of [
      'watch.cancelled',
      'watch.postponed',
      'watch.soldout',
      'watch.backonsale',
    ] as const) {
      expect(deliveryPolicyFor(category).ttlSeconds).toBe(12 * 60 * 60)
      expect(deliveryPolicyFor(category).silent).toBe(false)
    }
  })
})
