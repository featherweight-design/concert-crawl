import { z } from 'zod'

// Typed union for user-visible notification categories written to the
// `notifications` table (#971). Categories intentionally stay `text` on the
// column so the shipped admin categories (`crawl.*`) continue to work; this
// Zod union enforces the closed set at every write site.
//
// Bell-only categories are covered too. contest.* is written today by
// contest-notifications; crew.* is declared here ahead of the module that will
// write it (#1226 PR-7), so that module lands against an already-closed set.
//
// Push-eligible categories drive the send pipeline: PUSH_ELIGIBLE_CATEGORIES
// is the exact set that fires web push when the user has opted in.
//
// Lives in @concert-crawl/push (moved from apps/api in #763 PR 10) so the
// crawler's Spotify fan-out can share the same closed set + send pipeline.
export const UserNotificationCategorySchema = z.enum([
  'contest.resolved',
  'contest.needs_info',
  'watch.cancelled',
  'watch.postponed',
  'watch.soldout',
  'watch.backonsale',
  'watch.pricedrop',
  'spotify.new_show',
  // Crew activity (#1226) is bell-only, on the contest.* precedent — these
  // three are deliberately absent from PUSH_ELIGIBLE_CATEGORIES below.
  'crew.going',
  'crew.joined',
  'crew.left',
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
    'spotify.new_show',
  ])

export const PRICE_DROP_CATEGORY: UserNotificationCategory = 'watch.pricedrop'

// The four watch-update sub-types respect the `watchUpdatesEnabled`
// preference. Price drops respect `priceDropsEnabled`.
//
// `spotify.new_show` is deliberately in NEITHER sub-toggle set: within
// send-push only `masterEnabled` gates it. Its own opt-outs — the
// per-connection `userSpotifyConnections.pushEnabled` toggle and the
// premium `spotify-sync` entitlement — are enforced at the fan-out call
// site before send-push is ever invoked (eng spec §10.1).
export const WATCH_UPDATE_CATEGORIES: ReadonlySet<UserNotificationCategory> =
  new Set([
    'watch.cancelled',
    'watch.postponed',
    'watch.soldout',
    'watch.backonsale',
  ])
