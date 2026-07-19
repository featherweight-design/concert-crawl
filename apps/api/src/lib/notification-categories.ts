import { z } from 'zod'

// Typed union for user-visible notification categories written to the
// `notifications` table (#971). Categories intentionally stay `text` on the
// column so the shipped admin categories (`crawl.*`) continue to work; this
// Zod union enforces the closed set at every write site.
//
// Bell-only categories (contest.*) are covered too so contest-notifications
// gets compile-time safety on the same values it already writes.
//
// Push-eligible categories drive the send pipeline: PUSH_ELIGIBLE_CATEGORIES
// is the exact set that fires web push when the user has opted in.
export const UserNotificationCategorySchema = z.enum([
  'contest.resolved',
  'contest.needs_info',
  'watch.cancelled',
  'watch.postponed',
  'watch.soldout',
  'watch.backonsale',
  'watch.pricedrop',
])

export type UserNotificationCategory = z.infer<
  typeof UserNotificationCategorySchema
>

export const PUSH_ELIGIBLE_CATEGORIES: ReadonlySet<UserNotificationCategory> =
  new Set([
    'watch.cancelled',
    'watch.postponed',
    'watch.soldout',
    'watch.backonsale',
    'watch.pricedrop',
  ])

export const PRICE_DROP_CATEGORY: UserNotificationCategory = 'watch.pricedrop'

// The four watch-update sub-types respect the `watchUpdatesEnabled`
// preference. Price drops respect `priceDropsEnabled`.
export const WATCH_UPDATE_CATEGORIES: ReadonlySet<UserNotificationCategory> =
  new Set([
    'watch.cancelled',
    'watch.postponed',
    'watch.soldout',
    'watch.backonsale',
  ])
