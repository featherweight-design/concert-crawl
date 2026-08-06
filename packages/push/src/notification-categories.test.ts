import { describe, it, expect } from 'vitest'
import {
  PUSH_ELIGIBLE_CATEGORIES,
  UserNotificationCategorySchema,
  WATCH_UPDATE_CATEGORIES,
  type UserNotificationCategory,
} from './notification-categories.js'

const CREW_CATEGORIES: readonly UserNotificationCategory[] = [
  'crew.going',
  'crew.joined',
  'crew.left',
]

describe('crew notification categories', () => {
  it.each(CREW_CATEGORIES)(
    '%s is a valid notification category',
    (category) => {
      expect(UserNotificationCategorySchema.safeParse(category).success).toBe(
        true,
      )
    },
  )

  // Decision 9 — crew activity is bell-only, on the contest.* precedent. This
  // is the same shape of guard that keeps contest.* out of the send pipeline.
  it.each(CREW_CATEGORIES)('%s never reaches the push pipeline', (category) => {
    expect(PUSH_ELIGIBLE_CATEGORIES.has(category)).toBe(false)
  })

  it.each(CREW_CATEGORIES)(
    '%s is not governed by the watch-update sub-toggle',
    (category) => {
      expect(WATCH_UPDATE_CATEGORIES.has(category)).toBe(false)
    },
  )

  it('rejects a crew category that does not exist', () => {
    expect(
      UserNotificationCategorySchema.safeParse('crew.renamed').success,
    ).toBe(false)
  })
})
