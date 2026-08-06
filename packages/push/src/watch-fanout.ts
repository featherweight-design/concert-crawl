// #1064 watch-update fan-out. Given a state transition on an event (cancelled,
// postponed, sold-out), find every user watching that event, write a
// `notifications` bell row per watcher, and best-effort fire push via
// sendPushForNotification. Called from:
//   - apps/api/src/routes/event-reports.ts (user-confirm auto-promote)
//   - apps/api/src/routes/admin/events.ts (admin resolve → promoted)
//   - apps/api/src/routes/admin/events.ts (admin author sold-out)
//
// Bell rows are written for the notification bell (#737) — send-push then
// respects the user's per-category preferences before firing web push.
// Categories not push-eligible still get bell rows.

import { and, eq } from 'drizzle-orm'
// `import type` + `typeof X` in a type position is legal TS — the compiler
// resolves the reference at compile time only, no runtime emit. This
// pattern also keeps ESLint's `consistent-type-imports` happy (the imports
// are only used in type positions). Copilot round 4 flagged this as
// TS1361 but the concern is stale — modern TS lets type-only imports flow
// through `typeof` type queries without a value binding.
import type {
  events as EventsTable,
  notifications as NotificationsTable,
  userEvents as UserEventsTable,
  venues as VenuesTable,
  db,
} from '@concert-crawl/db'
import type { UserNotificationCategory } from './notification-categories.js'
import { sendPushForNotification, type SendPushInput } from './send-push.js'
import { watchNotificationCopy } from './definitions/copy.js'

// Inject the DB + schema references so the same helper is reusable from the
// API and from crawler-side callers without importing @concert-crawl/db
// twice (bundle-size + circular-dep guard).
export interface WatchFanoutDeps {
  db: typeof db
  notifications: typeof NotificationsTable
  userEvents: typeof UserEventsTable
  events: typeof EventsTable
  venues: typeof VenuesTable
  /** Injectable for tests. Defaults to send-push. */
  sendPush?: (input: SendPushInput) => Promise<unknown>
  /** Injectable for tests. Defaults to console.warn. */
  logWarn?: (message: string, meta?: unknown) => void
}

export interface FanoutInput {
  eventId: string
  category: UserNotificationCategory
  /**
   * Optional per-category context. When `category === 'watch.pricedrop'`,
   * pass `pricedrop: { newPriceMin, oldPriceMin }` so the copy template
   * can carry the concrete numbers (see the handoff mock in
   * design/design_handoff_pwa_cluster/pwa-data.jsx). If omitted for a
   * price-drop, the copy falls back to a generic "just dropped" line.
   */
  pricedrop?: { newPriceMin: string; oldPriceMin: string }
}

interface EventContext {
  title: string
  artist: string
  venueName: string
  date: string
}

const loadEventContext = async (
  deps: WatchFanoutDeps,
  eventId: string,
): Promise<EventContext | null> => {
  const [row] = await deps.db
    .select({
      title: deps.events.title,
      artist: deps.events.artist,
      venueName: deps.venues.name,
      date: deps.events.date,
    })
    .from(deps.events)
    .leftJoin(deps.venues, eq(deps.events.venueId, deps.venues.id))
    .where(eq(deps.events.id, eventId))
    .limit(1)

  if (!row) return null
  return {
    title: row.title,
    artist: row.artist,
    venueName: row.venueName ?? row.title,
    date: row.date,
  }
}

// Format YYYY-MM-DD into a short "Aug 14" — anchored at midday local so the
// UTC-midnight parse doesn't render the previous day in Mountain time. Same
// idiom used elsewhere in the codebase.
const shortDate = (raw: string): string => {
  const iso = raw.includes('T') ? raw : `${raw}T12:00:00`
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// Compose the notification title + body for a given category. Copy templates
// live in ./definitions/copy.ts (centralized per convention — see
// packages/crawler-core/src/lib/spotify-fanout/definitions/copy.ts). Categories
// that don't fan out through this helper (contest.*, spotify.new_show, crew.*)
// return empty strings so the caller can skip the write.
const composeMessage = (
  input: FanoutInput,
  ctx: EventContext,
): { title: string; body: string } => {
  const artistAtVenue = `${ctx.artist} at ${ctx.venueName}`
  switch (input.category) {
    case 'watch.cancelled':
      return watchNotificationCopy.cancelled(artistAtVenue)
    case 'watch.postponed':
      return watchNotificationCopy.postponed(artistAtVenue, shortDate(ctx.date))
    case 'watch.soldout':
      return watchNotificationCopy.soldout(artistAtVenue)
    case 'watch.backonsale':
      return watchNotificationCopy.backonsale(artistAtVenue)
    case 'watch.pricedrop':
      return watchNotificationCopy.pricedrop(artistAtVenue, input.pricedrop)
    case 'contest.resolved':
    case 'contest.needs_info':
    case 'spotify.new_show':
    case 'crew.going':
    case 'crew.joined':
    case 'crew.left':
      // Not fanned out here — contest.* handled by contest-notifications;
      // spotify.new_show handled by the crawler Spotify fan-out helper;
      // crew.* handled by crew-notifications (#1226 PR-7), bell-only.
      return { title: '', body: '' }
    default: {
      // Exhaustiveness assertion — a new category added to the union forces
      // a compile error here.
      const exhaustive: never = input.category
      return exhaustive
    }
  }
}

/**
 * Fan out a state transition to every user watching the given event.
 * Returns delivery counts for observability. Never throws — best-effort per
 * the send-push contract.
 */
export async function fanoutWatchNotification(
  deps: WatchFanoutDeps,
  input: FanoutInput,
): Promise<{ watchersNotified: number; pushDelivered: number }> {
  const logWarn =
    deps.logWarn ??
    ((msg: string, meta?: unknown) => {
      console.warn(msg, meta)
    })
  const sendPush = deps.sendPush ?? sendPushForNotification

  const context = await loadEventContext(deps, input.eventId).catch(
    (loadErr) => {
      logWarn('watch-fanout: failed to load event context', {
        eventId: input.eventId,
        err: loadErr,
      })
      return null
    },
  )
  if (!context) return { watchersNotified: 0, pushDelivered: 0 }

  const message = composeMessage(input, context)
  if (!message.title) {
    // Category doesn't apply to fan-out (contest.* etc.). Nothing to write.
    return { watchersNotified: 0, pushDelivered: 0 }
  }

  // Only fan out to users who explicitly opted in with status='watching'.
  // user_events also carries 'going' (I bought a ticket) and 'interested'
  // (curious) — those cohorts get treated separately (order comms + a
  // future FYI channel). Watch-update notifications are the express
  // opt-in for "tell me if this show changes", same filter used by
  // apps/api/src/routes/watching.ts and search.ts.
  const watchers = await deps.db
    .select({ userId: deps.userEvents.userId })
    .from(deps.userEvents)
    .where(
      and(
        eq(deps.userEvents.eventId, input.eventId),
        eq(deps.userEvents.status, 'watching'),
      ),
    )
    .catch((watchersErr): { userId: string }[] => {
      logWarn('watch-fanout: failed to read watchers', {
        eventId: input.eventId,
        err: watchersErr,
      })
      return []
    })

  if (watchers.length === 0) return { watchersNotified: 0, pushDelivered: 0 }

  const actionUrl = `/events/${input.eventId}`

  // Bell rows: write one `notifications` row per watcher. Uses the shared
  // `user_notification` type so the bell (#737) reads them alongside contest.*
  // rows. `metadata` carries the category so downstream can branch on it
  // without re-parsing the title.
  const rows = watchers.map((watcher) => ({
    userId: watcher.userId,
    type: 'user_notification' as const,
    category: input.category,
    title: message.title,
    body: message.body,
    actionUrl,
    metadata: JSON.stringify({
      eventId: input.eventId,
      category: input.category,
    }),
  }))

  try {
    await deps.db.insert(deps.notifications).values(rows)
  } catch (insertErr) {
    logWarn('watch-fanout: notifications insert failed', {
      eventId: input.eventId,
      category: input.category,
      err: insertErr,
    })
    return { watchersNotified: 0, pushDelivered: 0 }
  }

  // Best-effort push per watcher. Failures are logged inside send-push and
  // don't roll back the bell rows above (the bell is the primary channel;
  // push is a side channel). Bounded concurrency: sendPushForNotification
  // itself Promise.all-s per-subscription, so a flat Promise.all across a
  // large watcher list would multiply outbound requests. Chunked send caps
  // the fan-out at PUSH_CONCURRENCY at a time — plenty fast for typical
  // watcher counts, safe against a viral show with hundreds of watchers.
  let delivered = 0
  const sendOne = async (watcher: { userId: string }) => {
    try {
      const result = await sendPush({
        userId: watcher.userId,
        category: input.category,
        title: message.title,
        body: message.body,
        actionUrl,
        tag: `watch-${input.eventId}-${input.category}`,
      })
      if (
        typeof result === 'object' &&
        result !== null &&
        'delivered' in result &&
        typeof result.delivered === 'number'
      ) {
        delivered += result.delivered
      }
    } catch (pushErr) {
      logWarn('watch-fanout: push send failed', {
        userId: watcher.userId,
        category: input.category,
        err: pushErr,
      })
    }
  }
  for (let idx = 0; idx < watchers.length; idx += PUSH_CONCURRENCY) {
    const chunk = watchers.slice(idx, idx + PUSH_CONCURRENCY)
    await Promise.all(chunk.map(sendOne))
  }

  return { watchersNotified: watchers.length, pushDelivered: delivered }
}

// Concurrency cap on per-watcher push sends. sendPushForNotification itself
// Promise.all-s per subscription, so 10 watchers × 3 subscriptions each with
// a flat fan-out would hit 30 outbound requests at once. A cap of 10 keeps
// worst-case in-flight at 10 × subscriptions-per-user — modest under any
// realistic watchlist and safe for the free-tier web-push queue.
const PUSH_CONCURRENCY = 10

// Utility for callers that want a "cross" of admin actions where the resolved
// event_report status maps to a watch category. Keeps the mapping in one
// place — same table used at all three integration points.
export const WATCH_CATEGORY_FROM_REPORT_STATUS: Readonly<
  Record<'cancelled' | 'postponed' | 'sold-out', UserNotificationCategory>
> = {
  cancelled: 'watch.cancelled',
  postponed: 'watch.postponed',
  'sold-out': 'watch.soldout',
}
