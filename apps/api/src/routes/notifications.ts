// apps/api/src/routes/notifications.ts
// Consumer-facing read path for the in-app notification surface (#737).
//
// Three fan-outs already write `type = 'user_notification'` rows (watch
// updates, price-check resolutions, Spotify new-show alerts); this router is
// the only thing that lets a signed-in user read them. Every endpoint is
// scoped to the caller — there is no cross-user read here.
//
// HTTP VERBS: the state-advance endpoints below are POST, deliberately. They
// are idempotent commands ("mark this read", "mark everything read", "I opened
// the panel"), not partial updates of a resource representation, and #737
// scopes them as POST. Do not harmonize them to PATCH.
import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { zValidator } from '@hono/zod-validator'
import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  isNull,
  lt,
  or,
  sql,
} from 'drizzle-orm'
import { z } from 'zod'
import { db, notifications, userProfiles } from '@concert-crawl/db'
import { UserNotificationCategorySchema } from '@concert-crawl/push'
import { apiLogger } from '../lib/logger.js'
import {
  NOTIFICATION_BACKFILL_DAYS,
  NOTIFICATION_PAGE_SIZE,
  NOTIFICATION_PAGE_SIZE_MAX,
} from '../lib/definitions/notification-windows.js'

export const notificationsRouter = new Hono()

notificationsRouter.use('*', clerkMiddleware())

const listQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(NOTIFICATION_PAGE_SIZE_MAX)
    .default(NOTIFICATION_PAGE_SIZE),
  // Opaque; clients echo back `nextCursor` and never construct one. See
  // encodeCursor for why it is not a plain timestamp.
  cursor: z.string().optional(),
})

/**
 * Keyset cursor over `(created_at, id)`.
 *
 * Both halves are load-bearing. `created_at` defaults to `now()`, which is
 * transaction-start time, so a fan-out writing several rows for one user in one
 * transaction stamps them all identically — paging on the timestamp alone would
 * skip every tied row after the first, hence `id`.
 *
 * The timestamp travels as the database's own text rendering rather than an ISO
 * string, because `timestamptz` holds microseconds and a JS `Date` holds only
 * milliseconds. Round-tripping through `Date` truncates, after which the
 * equality branch below can never match a real row and the strictly-less-than
 * branch silently swallows anything inside the truncated microsecond.
 *
 * Opaque so that half a cursor is not a representable request: serving page one
 * to a client that believes it asked for page three surfaces as "duplicate
 * notifications" a long way from the cause.
 */
const encodeCursor = (createdAtText: string, id: string): string =>
  Buffer.from(`${createdAtText}|${id}`, 'utf8').toString('base64url')

/**
 * Postgres' own rendering of `timestamptz`, e.g. `2026-08-01 12:00:00.0001+00`.
 * Matched strictly, because the timestamp half is cast with `::timestamptz` in
 * the query: anything that decodes but will not cast would surface as a 500
 * "Read failed" rather than the 400 a bad cursor deserves.
 */
const PG_TIMESTAMPTZ =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?[+-]\d{2}(:\d{2})?$/

const decodeCursor = (
  raw: string,
): { createdAtText: string; id: string } | null => {
  const parts = Buffer.from(raw, 'base64url').toString('utf8').split('|')
  const [createdAtText, id, ...rest] = parts
  if (createdAtText === undefined || id === undefined || rest.length > 0) {
    return null
  }
  if (
    !PG_TIMESTAMPTZ.test(createdAtText) ||
    !z.string().uuid().safeParse(id).success
  ) {
    return null
  }
  return { createdAtText, id }
}

const metadataSchema = z.record(z.unknown())

const DAY_MS = 24 * 60 * 60 * 1000

const backfillCutoff = (): Date =>
  new Date(Date.now() - NOTIFICATION_BACKFILL_DAYS * DAY_MS)

/** Rows this user may see in the panel: their own, consumer-typed, in-window. */
const inWindowForUser = (userId: string, cutoff: Date) =>
  and(
    eq(notifications.userId, userId),
    eq(notifications.type, 'user_notification'),
    gt(notifications.createdAt, cutoff),
  )

/**
 * `notifications.metadata` is a `text` column holding a JSON string (not
 * jsonb), so it can only be trusted after a parse. A malformed blob degrades
 * to `null` rather than failing the whole list — a broken writer must never
 * take the panel down.
 */
const parseMetadata = (
  raw: string | null,
  context: { userId: string; notificationId: string },
): Record<string, unknown> | null => {
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    const result = metadataSchema.safeParse(parsed)
    if (!result.success) {
      apiLogger.warn(
        { ...context },
        'notifications: metadata is not an object — returning null',
      )
      return null
    }
    return result.data
  } catch (parseErr) {
    apiLogger.warn(
      { ...context, err: parseErr },
      'notifications: failed to parse metadata JSON — returning null',
    )
    return null
  }
}

// GET /v1/notifications — the panel's only read. Returns the page, the true
// unread count, whether an older page exists, and the panel-seen watermark so
// the client can draw the fresh/backfill divider without a second call.
notificationsRouter.get(
  '/',
  zValidator('query', listQuerySchema),
  async (ctx) => {
    const authInfo = getAuth(ctx)
    const userId = authInfo?.userId ?? null
    if (!userId) return ctx.json({ success: false, error: 'Unauthorized' }, 401)

    const { limit, cursor: rawCursor } = ctx.req.valid('query')
    const cutoff = backfillCutoff()

    const decoded = rawCursor === undefined ? null : decodeCursor(rawCursor)
    if (rawCursor !== undefined && decoded === null) {
      return ctx.json({ success: false, error: 'Invalid cursor' }, 400)
    }

    // Keyset predicate on `(created_at, id)` descending, comparing against the
    // database's own text timestamp so no precision is lost (see encodeCursor).
    const keyset =
      decoded === null
        ? undefined
        : or(
            sql`${notifications.createdAt} < ${decoded.createdAtText}::timestamptz`,
            and(
              sql`${notifications.createdAt} = ${decoded.createdAtText}::timestamptz`,
              lt(notifications.id, decoded.id),
            ),
          )

    try {
      const rows = await db
        .select({
          ...getTableColumns(notifications),
          createdAtText: sql<string>`${notifications.createdAt}::text`,
        })
        .from(notifications)
        .where(
          keyset === undefined
            ? inWindowForUser(userId, cutoff)
            : and(inWindowForUser(userId, cutoff), keyset),
        )
        .orderBy(desc(notifications.createdAt), desc(notifications.id))
        // One extra row is the cheapest possible hasMore probe.
        .limit(limit + 1)

      const hasMore = rows.length > limit
      const page = hasMore ? rows.slice(0, limit) : rows
      const last = page.at(-1)
      const nextCursor =
        hasMore && last !== undefined
          ? encodeCursor(last.createdAtText, last.id)
          : null

      const items = page.map((row) => {
        // An unknown/legacy category still ships to the client as its raw
        // string; the panel falls back to a neutral presentation. Dropping the
        // row would silently hide a real notification.
        if (!UserNotificationCategorySchema.safeParse(row.category).success) {
          apiLogger.warn(
            { userId, category: row.category },
            'notifications: unknown category returned raw',
          )
        }
        return {
          id: row.id,
          category: row.category,
          title: row.title,
          body: row.body,
          actionUrl: row.actionUrl,
          readAt: row.readAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
          metadata: parseMetadata(row.metadata, {
            userId,
            notificationId: row.id,
          }),
        }
      })

      // Uncapped on purpose: the visible affordance is a dot, so this number
      // exists only for the aria-label. Announcing a capped "99" to someone
      // with 140 unread would be wrong. Any capping is a render-layer choice.
      const [unread] = await db
        .select({ value: count() })
        .from(notifications)
        .where(
          and(inWindowForUser(userId, cutoff), isNull(notifications.readAt)),
        )

      const [profile] = await db
        .select({ notificationsSeenAt: userProfiles.notificationsSeenAt })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))

      return ctx.json({
        success: true,
        data: {
          items,
          unreadCount: unread?.value ?? 0,
          hasMore,
          nextCursor,
          seenAt: profile?.notificationsSeenAt?.toISOString() ?? null,
        },
      })
    } catch (readErr) {
      apiLogger.warn({ userId, err: readErr }, 'notifications: list failed')
      return ctx.json({ success: false, error: 'Read failed' }, 500)
    }
  },
)

// ROUTE ORDER MATTERS: Hono matches in registration order, so the literal
// `/read-all` MUST be registered before the `/:id/read` parameter route.
// Registered the other way round, `read-all` would be swallowed by `:id` and
// fail the UUID guard with a 400.
notificationsRouter.post('/read-all', async (ctx) => {
  const authInfo = getAuth(ctx)
  const userId = authInfo?.userId ?? null
  if (!userId) return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  try {
    // One statement, no N+1: everything unread in the same window the list
    // endpoint shows.
    // No `.returning()` — only the affected-row count is reported, so there is
    // no reason for the response to cost one materialized row per notification.
    const result = await db
      .update(notifications)
      .set({ readAt: sql`now()` })
      .where(
        and(
          inWindowForUser(userId, backfillCutoff()),
          isNull(notifications.readAt),
        ),
      )
    return ctx.json({ success: true, data: { updated: result.count } })
  } catch (writeErr) {
    apiLogger.warn({ userId, err: writeErr }, 'notifications: read-all failed')
    return ctx.json({ success: false, error: 'Write failed' }, 500)
  }
})

// POST /v1/notifications/:id/read — idempotent via coalesce: a second call
// leaves the original readAt in place and still returns 200.
notificationsRouter.post('/:id/read', async (ctx) => {
  const authInfo = getAuth(ctx)
  const userId = authInfo?.userId ?? null
  if (!userId) return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const idParam = z.string().uuid().safeParse(ctx.req.param('id'))
  if (!idParam.success) {
    return ctx.json({ success: false, error: 'Invalid notification id' }, 400)
  }

  try {
    const rows = await db
      .update(notifications)
      .set({ readAt: sql`coalesce(${notifications.readAt}, now())` })
      .where(
        and(
          eq(notifications.id, idParam.data),
          eq(notifications.userId, userId),
          eq(notifications.type, 'user_notification'),
        ),
      )
      .returning({ id: notifications.id })
    if (rows.length === 0) {
      return ctx.json({ success: false, error: 'Not found' }, 404)
    }
    return ctx.json({ success: true, data: null })
  } catch (writeErr) {
    apiLogger.warn({ userId, err: writeErr }, 'notifications: mark-read failed')
    return ctx.json({ success: false, error: 'Write failed' }, 500)
  }
})

// POST /v1/notifications/mark-panel-seen — advances the panel watermark.
// SEEN ≠ READ: this clears the pip without touching any row's readAt, which is
// the whole point of the two-level model. A dedicated endpoint (rather than
// overloading PATCH /v1/users/me) keeps pip derivation to a single read and
// keeps profile saves free of a hidden side effect.
notificationsRouter.post('/mark-panel-seen', async (ctx) => {
  const authInfo = getAuth(ctx)
  const userId = authInfo?.userId ?? null
  if (!userId) return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  try {
    const [row] = await db
      .insert(userProfiles)
      .values({ userId, notificationsSeenAt: sql`now()` })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          // `now()` is transaction-start time, so two concurrent marks can
          // commit out of order; greatest() stops the later writer stamping an
          // earlier timestamp and walking the watermark backwards.
          notificationsSeenAt: sql`greatest(${userProfiles.notificationsSeenAt}, now())`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ notificationsSeenAt: userProfiles.notificationsSeenAt })
    return ctx.json({
      success: true,
      data: { seenAt: row?.notificationsSeenAt?.toISOString() ?? null },
    })
  } catch (writeErr) {
    apiLogger.warn(
      { userId, err: writeErr },
      'notifications: mark-panel-seen failed',
    )
    return ctx.json({ success: false, error: 'Write failed' }, 500)
  }
})
