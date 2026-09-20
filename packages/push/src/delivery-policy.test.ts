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
  it('asks every push-eligible category to wake the device', () => {
    for (const category of PUSH_ELIGIBLE_CATEGORIES) {
      expect(deliveryPolicyFor(category).urgency).toBe('high')
    }
  })

  // Leaving one eligible category at `normal` while shortening its TTL would
  // be strictly worse than before: the wake is still not requested, and the
  // window in which it could surface on next app-open drops from the
  // library's four weeks to one day. Whatever a category's TTL, it only makes
  // sense alongside a wake.
  it('never shortens the TTL of a category it did not also wake', () => {
    for (const category of PUSH_ELIGIBLE_CATEGORIES) {
      const { urgency, ttlSeconds } = deliveryPolicyFor(category)
      const WEB_PUSH_DEFAULT_TTL = 2419200
      if (ttlSeconds < WEB_PUSH_DEFAULT_TTL) {
        expect(urgency).toBe('high')
      }
    }
  })

  // The new-show fan-out runs on the 3 AM crawl. High urgency without silence
  // would turn a delivery fix into a 3 AM alarm.
  // Everything that should arrive without interrupting: the 3 AM new-show
  // fan-out, and a price drop.
  it('silences exactly the categories that must not interrupt', () => {
    const silent = UserNotificationCategorySchema.options.filter(
      (category) => deliveryPolicyFor(category).silent,
    )
    expect(silent.sort()).toEqual(['artist.new_show', 'watch.pricedrop'])
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
