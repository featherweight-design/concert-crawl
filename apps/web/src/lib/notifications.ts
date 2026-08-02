// Client for the consumer notification read path (#737 PR-B), against the
// shipped router at apps/api/src/routes/notifications.ts.
//
// WHY HAND-WRITTEN GUARDS RATHER THAN ZOD: apps/web ships no Zod — api.ts
// already narrows the envelope with pure runtime guards for exactly this
// reason (a validator in a client bundle costs every page load). The exported
// entry point keeps Zod's `safeParse` shape — a discriminated
// `{ success, data } | { success, error }` — so callers read the same either
// way, and `fetchNotifications` turns a mismatch into the codebase's ApiError.
//
// PAGING IS AN OPAQUE CURSOR. The API base64-encodes `(created_at, id)`; a
// client that parses or constructs one will silently serve page 1 to someone
// who asked for page 3. Echo `nextCursor` back verbatim, never build one.

import { apiClient, ApiError } from './api'

/**
 * Mirrors `UserNotificationCategorySchema`
 * (packages/push/src/notification-categories.ts), which is the source of
 * truth. Duplicated rather than imported because @concert-crawl/push is a
 * server package (web-push, node crypto) and must not enter the browser
 * bundle. If a ninth category lands there, add it here too — an unrecognised
 * value still renders, via CATEGORY_FALLBACK.
 */
export type NotificationCategory =
  | 'watch.cancelled'
  | 'watch.postponed'
  | 'watch.soldout'
  | 'watch.backonsale'
  | 'watch.pricedrop'
  | 'contest.resolved'
  | 'contest.needs_info'
  | 'spotify.new_show'

export const NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = [
  'watch.cancelled',
  'watch.postponed',
  'watch.soldout',
  'watch.backonsale',
  'watch.pricedrop',
  'contest.resolved',
  'contest.needs_info',
  'spotify.new_show',
]

const CATEGORY_LOOKUP: ReadonlySet<string> = new Set(NOTIFICATION_CATEGORIES)

export const isNotificationCategory = (
  value: unknown,
): value is NotificationCategory =>
  typeof value === 'string' && CATEGORY_LOOKUP.has(value)

export interface ConsumerNotification {
  id: string
  /**
   * The raw string, not the narrowed union: the API deliberately passes an
   * unknown/legacy category through rather than dropping the row, so the
   * panel falls back to a neutral presentation instead of hiding real news.
   */
  category: string
  title: string
  body: string
  actionUrl: string | null
  /** ISO string, or null when the row has never been opened. */
  readAt: string | null
  /** ISO string. */
  createdAt: string
  metadata: Record<string, unknown> | null
}

export interface NotificationListResult {
  items: ConsumerNotification[]
  /** Uncapped by design — the visible affordance is a dot, this is for speech. */
  unreadCount: number
  hasMore: boolean
  /** Opaque. Echo back, never parse. */
  nextCursor: string | null
  /**
   * When the panel was last opened. `null` means "nothing seen yet" — the
   * majority case at launch, since no user has ever opened this panel. It
   * does NOT mean "everything is backfill".
   */
  seenAt: string | null
}

/** Matches the API's own default and max-useful page (NOTIFICATION_PAGE_SIZE). */
export const NOTIFICATION_PAGE_SIZE = 20

export type ParseResult<T> =
  { success: true; data: T } | { success: false; error: string }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string'

/**
 * `actionUrl` is untrusted: it is written by backend fan-outs into a DB column
 * and rendered back here, so a bad row must not become an open redirect once
 * PR-C makes the row navigable. Only a same-origin absolute path survives —
 * anything else degrades to `null`, which renders a non-navigating row rather
 * than dropping the notification entirely.
 *
 * This is deliberately stricter than `safeSameOriginPath` in `app/sw.ts`: that
 * one resolves against `self.location.origin`, which does not exist during SSR.
 * A leading `//` is rejected because it is protocol-relative, not a path.
 */
const sameOriginPathOrNull = (raw: string | null): string | null => {
  if (raw === null || !raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}

const parseItem = (value: unknown): ConsumerNotification | null => {
  if (!isRecord(value)) return null
  const { id, category, title, body, actionUrl, readAt, createdAt, metadata } =
    value

  if (typeof id !== 'string') return null
  if (typeof category !== 'string') return null
  if (typeof title !== 'string') return null
  if (typeof body !== 'string') return null
  if (typeof createdAt !== 'string') return null
  if (!isNullableString(actionUrl)) return null
  const safeActionUrl = sameOriginPathOrNull(actionUrl)
  if (!isNullableString(readAt)) return null
  if (metadata !== null && !isRecord(metadata)) return null
  return {
    id,
    category,
    title,
    body,
    actionUrl: safeActionUrl,
    readAt,
    createdAt,
    metadata,
  }
}

export const safeParseNotificationList = (
  value: unknown,
): ParseResult<NotificationListResult> => {
  if (!isRecord(value)) {
    return { success: false, error: 'Notification payload is not an object' }
  }
  const { items, unreadCount, hasMore, nextCursor, seenAt } = value
  if (!Array.isArray(items)) {
    return { success: false, error: 'Notification payload has no items array' }
  }
  if (typeof unreadCount !== 'number' || !Number.isFinite(unreadCount)) {
    return { success: false, error: 'Notification unreadCount is not a number' }
  }
  if (typeof hasMore !== 'boolean') {
    return { success: false, error: 'Notification hasMore is not a boolean' }
  }
  if (!isNullableString(nextCursor)) {
    return { success: false, error: 'Notification nextCursor is not a string' }
  }
  if (!isNullableString(seenAt)) {
    return { success: false, error: 'Notification seenAt is not a string' }
  }

  const parsed: ConsumerNotification[] = []
  for (const raw of items) {
    const item = parseItem(raw)
    if (item === null) {
      return { success: false, error: 'Notification row failed validation' }
    }
    parsed.push(item)
  }

  return {
    success: true,
    data: { items: parsed, unreadCount, hasMore, nextCursor, seenAt },
  }
}

export async function fetchNotifications(
  token: string,
  cursor?: string,
): Promise<NotificationListResult> {
  const query = cursor
    ? `?limit=${NOTIFICATION_PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`
    : `?limit=${NOTIFICATION_PAGE_SIZE}`
  const body = await apiClient.get<unknown>(`/v1/notifications${query}`, token)
  const result = safeParseNotificationList(body)
  if (!result.success) {
    // 502: the transport succeeded, the upstream shape did not. Surfacing it
    // as an ApiError puts it on the same error path as every other API
    // failure, which is what the panel's error state renders.
    throw new ApiError(502, result.error)
  }
  return result.data
}

export async function markNotificationRead(
  token: string,
  id: string,
): Promise<void> {
  await apiClient.post<unknown>(
    `/v1/notifications/${encodeURIComponent(id)}/read`,
    token,
    {},
  )
}

export async function markAllNotificationsRead(token: string): Promise<number> {
  const body = await apiClient.post<unknown>(
    '/v1/notifications/read-all',
    token,
    {},
  )
  if (!isRecord(body) || typeof body['updated'] !== 'number') {
    throw new ApiError(502, 'read-all returned no updated count')
  }
  return body['updated']
}

export async function markPanelSeen(token: string): Promise<string | null> {
  const body = await apiClient.post<unknown>(
    '/v1/notifications/mark-panel-seen',
    token,
    {},
  )
  if (!isRecord(body) || !isNullableString(body['seenAt'])) {
    throw new ApiError(502, 'mark-panel-seen returned no watermark')
  }
  return body['seenAt']
}
