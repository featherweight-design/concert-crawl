import { Hono } from 'hono'
import type { SQL, SQLWrapper } from 'drizzle-orm'
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { unionAll } from 'drizzle-orm/pg-core'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  db,
  events,
  inboxReads,
  inboxReadWatermarks,
  notifications,
  priceSubmissions,
  venues,
} from '@concert-crawl/db'
import type { InboxItemType } from '@concert-crawl/types'
import { getAuthUser } from '../../middleware/auth.js'
import type { AdminVariables } from './index.js'

export const inboxAdminRouter = new Hono<AdminVariables>()

// The four inbox categories. Order is deterministic so the mark-all-read
// "all categories" path and the unread-count assembly are stable.
const INBOX_CATEGORIES: readonly InboxItemType[] = [
  'event_flag',
  'price_submission',
  'blocked_venue',
  'crawl_failure',
]

const inboxItemTypeSchema = z.enum([
  'event_flag',
  'price_submission',
  'blocked_venue',
  'crawl_failure',
])

// Render a timestamptz as an ISO 8601 UTC string ("2026-01-01T12:00:00.123Z").
// Timestamps that flow through a union subquery come back from postgres-js as
// raw Postgres text (space separator, "+00" offset), which is not valid ISO
// and would be rejected by the POST /read z.string().datetime() validator when
// the client echoes it back. Formatting in SQL guarantees a round-trippable
// value regardless of driver type inference.
function toIsoUtc(expr: SQLWrapper): SQL<string> {
  return sql<string>`to_char(${expr} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
}

// One normalized subquery per category. Each selects the shared row shape
// { itemType, itemId, title, body, actionUrl, sourceCreatedAt } so the four
// can be UNION ALL'd. `sourceCreatedAt` is explicitly mapped per category —
// never a generic createdAt — so sort order and watermark read-derivation key
// off the timestamp that reflects when the item entered the inbox.
function eventFlagSubquery() {
  return db
    .select({
      // Column aliases are prefixed `inbox_` so they never collide with the
      // real item_type / item_id / source_created_at columns on inbox_reads /
      // inbox_read_watermarks in the downstream JOINs. Drizzle renders these
      // sql-derived subquery columns as bare identifiers (no subquery-alias
      // qualifier), so a plain `item_type` here would be ambiguous once joined.
      // Cast the literal to the enum type so the downstream join predicate
      // `inbox_reads.item_type = <this>` compares enum = enum (Postgres has no
      // implicit enum = text operator).
      itemType: sql<InboxItemType>`'event_flag'::inbox_item_type`.as(
        'inbox_item_type',
      ),
      itemId: sql<string>`${events.id}::text`.as('inbox_item_id'),
      title: sql<string>`${events.title}`.as('title'),
      body: sql<string>`${events.artist}`.as('body'),
      actionUrl: sql<string>`'/admin/review'`.as('action_url'),
      // Use updatedAt, not createdAt: POST /bulk/unverify flips verified back
      // to false and bumps updatedAt while leaving createdAt frozen, so a
      // re-flagged event both sorts fresh and becomes a new unread occurrence.
      // Truncate to millisecond precision (timestamptz(3)). The client reads
      // this value as an ISO string (ms precision) and echoes it back to
      // POST /read, which stores `new Date(...)` — also ms precision. Postgres
      // timestamptz keeps microseconds, so without this cast the occurrence
      // join (inbox_reads.source_created_at = <this>) would never match a
      // round-tripped mark whose sub-millisecond digits were dropped.
      sourceCreatedAt: sql<string>`${events.updatedAt}::timestamptz(3)`.as(
        'inbox_source_created_at',
      ),
    })
    .from(events)
    .where(eq(events.verified, false))
}

function priceSubmissionSubquery() {
  return db
    .select({
      itemType: sql<InboxItemType>`'price_submission'::inbox_item_type`.as(
        'inbox_item_type',
      ),
      itemId: sql<string>`${priceSubmissions.id}::text`.as('inbox_item_id'),
      title: sql<string>`'New price submission'`.as('title'),
      body: sql<string>`'Pending community price submission awaiting review'`.as(
        'body',
      ),
      actionUrl: sql<string>`'/admin/prices/submissions'`.as('action_url'),
      sourceCreatedAt:
        sql<string>`${priceSubmissions.createdAt}::timestamptz(3)`.as(
          'inbox_source_created_at',
        ),
    })
    .from(priceSubmissions)
    .where(
      and(
        eq(priceSubmissions.status, 'pending'),
        // Exclude contest counters — matches the submissions endpoint filter.
        sql`${priceSubmissions.disputedSubmissionId} IS NULL`,
      ),
    )
}

function blockedVenueSubquery() {
  return db
    .select({
      itemType: sql<InboxItemType>`'blocked_venue'::inbox_item_type`.as(
        'inbox_item_type',
      ),
      itemId: sql<string>`${venues.id}::text`.as('inbox_item_id'),
      title: sql<string>`${venues.name}`.as('title'),
      body: sql<string>`'Venue is blocked and not being crawled'`.as('body'),
      actionUrl: sql<string>`'/admin/venues'`.as('action_url'),
      // blockedAt (when the venue was blocked), not the row's createdAt. It is
      // cleared on a successful crawl and re-set on a later block, so a
      // re-blocked venue carries a new blockedAt and re-enters as unread.
      sourceCreatedAt: sql<string>`${venues.blockedAt}::timestamptz(3)`.as(
        'inbox_source_created_at',
      ),
    })
    .from(venues)
    .where(isNotNull(venues.blockedAt))
}

function crawlFailureSubquery() {
  return db
    .select({
      itemType: sql<InboxItemType>`'crawl_failure'::inbox_item_type`.as(
        'inbox_item_type',
      ),
      itemId: sql<string>`${notifications.id}::text`.as('inbox_item_id'),
      title: sql<string>`${notifications.title}`.as('title'),
      body: sql<string>`${notifications.body}`.as('body'),
      // The crawl notification writers set only metadata, not the actionUrl
      // column, so fall back to /admin/crawl when it's null.
      actionUrl:
        sql<string>`coalesce(${notifications.actionUrl}, '/admin/crawl')`.as(
          'action_url',
        ),
      sourceCreatedAt:
        sql<string>`${notifications.createdAt}::timestamptz(3)`.as(
          'inbox_source_created_at',
        ),
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.type, 'admin_alert'),
        inArray(notifications.category, [
          'crawl.failed',
          'crawl.event_count_dropped',
          // A capped catalogue (#1185) is a crawl-health problem in the same
          // sense as the other two — the run reported success, but the venue's
          // data is wrong — so it lands in the same crawl_failure bucket.
          'crawl.event_ceiling_suspected',
          // Same rationale: the run succeeded and the events are real, but
          // their ticket links are missing, so the consumer CTA is broken.
          'crawl.url_coverage_gap',
        ]),
      ),
    )
}

const querySchema = z.object({
  category: inboxItemTypeSchema.optional(),
  status: z.enum(['unread', 'read', 'all']).optional().default('unread'),
  // Opt-in total count, mirroring /v1/admin/prices/*. NOT z.coerce.boolean(),
  // which wrongly coerces the string "false" to true.
  count: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

// GET /v1/admin/inbox — unified, paginated, filterable inbox with read state.
inboxAdminRouter.get(
  '/',
  zValidator('query', querySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid query params' }, 422)
    }
  }),
  async (ctx) => {
    const { category, status, count, limit, offset } = ctx.req.valid('query')

    // Always UNION ALL all four categories (fixed arity) and apply the
    // optional category filter as a WHERE on the union below. Keeping the
    // union shape constant avoids a variadic-length union type.
    const unionQuery = unionAll(
      eventFlagSubquery(),
      priceSubmissionSubquery(),
      blockedVenueSubquery(),
      crawlFailureSubquery(),
    )

    const inbox = unionQuery.as('inbox')

    const categoryFilter = category ? eq(inbox.itemType, category) : undefined

    // Read derivation. Either join can miss (NULL); `sourceCreatedAt <= NULL`
    // is NULL (not false) in SQL, so guard the watermark branch explicitly.
    const isReadExpr = sql<boolean>`(
      ${inboxReads.readAt} IS NOT NULL
      OR (
        ${inboxReadWatermarks.readUpTo} IS NOT NULL
        AND ${inbox.sourceCreatedAt} <= ${inboxReadWatermarks.readUpTo}
      )
    )`
    // Format the derived read timestamp as an ISO 8601 UTC string for the
    // wire. A bare timestamptz(3) inside a union comes back from the driver as
    // Postgres text ("2026-01-01 12:00:00.123+00"), which is NOT valid ISO and
    // would fail the POST /read Zod z.string().datetime() check when echoed
    // back. to_char with the AT TIME ZONE 'UTC' + trailing Z gives a clean
    // round-trippable value.
    const readAtExpr = sql<string | null>`
      CASE WHEN (
        ${inboxReads.readAt} IS NOT NULL
        OR (
          ${inboxReadWatermarks.readUpTo} IS NOT NULL
          AND ${inbox.sourceCreatedAt} <= ${inboxReadWatermarks.readUpTo}
        )
      )
      THEN ${toIsoUtc(sql`coalesce(${inboxReads.readAt}, ${inboxReadWatermarks.readUpTo})`)}
      ELSE NULL END
    `

    const statusFilter =
      status === 'unread'
        ? sql`NOT ${isReadExpr}`
        : status === 'read'
          ? isReadExpr
          : undefined

    const whereFilter =
      categoryFilter && statusFilter
        ? and(categoryFilter, statusFilter)
        : (categoryFilter ?? statusFilter)

    const baseQuery = db
      .select({
        itemType: inbox.itemType,
        itemId: inbox.itemId,
        title: inbox.title,
        body: inbox.body,
        actionUrl: inbox.actionUrl,
        // Serialize the occurrence timestamp as ISO 8601 UTC (see readAtExpr).
        sourceCreatedAt: toIsoUtc(inbox.sourceCreatedAt).as(
          'source_created_at',
        ),
        readAt: readAtExpr,
      })
      .from(inbox)
      // Occurrence-based join — the source_created_at term keeps a stale mark
      // from an earlier occurrence from masking a fresh one.
      .leftJoin(
        inboxReads,
        and(
          eq(inboxReads.itemType, inbox.itemType),
          eq(inboxReads.itemId, inbox.itemId),
          eq(inboxReads.sourceCreatedAt, inbox.sourceCreatedAt),
        ),
      )
      .leftJoin(
        inboxReadWatermarks,
        eq(inboxReadWatermarks.itemType, inbox.itemType),
      )

    const rowsPromise = (whereFilter ? baseQuery.where(whereFilter) : baseQuery)
      .orderBy(
        desc(inbox.sourceCreatedAt),
        asc(inbox.itemType),
        asc(inbox.itemId),
      )
      .limit(limit)
      .offset(offset)

    // unreadCounts — always computed across the FULL inbox per category,
    // independent of the current category/status query params, so the filter-
    // rail badges stay accurate while the list is filtered.
    const unreadCountsPromise = computeUnreadCounts()

    const [rows, unreadCounts] = await Promise.all([
      rowsPromise,
      unreadCountsPromise,
    ])

    if (!count) {
      return ctx.json({
        success: true,
        data: { items: rows, unreadCounts },
      })
    }

    const totalQuery = db
      .select({ total: sql<number>`count(*)::int` })
      .from(inbox)
      .leftJoin(
        inboxReads,
        and(
          eq(inboxReads.itemType, inbox.itemType),
          eq(inboxReads.itemId, inbox.itemId),
          eq(inboxReads.sourceCreatedAt, inbox.sourceCreatedAt),
        ),
      )
      .leftJoin(
        inboxReadWatermarks,
        eq(inboxReadWatermarks.itemType, inbox.itemType),
      )
    const totalResult = await (whereFilter
      ? totalQuery.where(whereFilter)
      : totalQuery)
    const total = totalResult[0]?.total ?? 0

    return ctx.json({
      success: true,
      data: { items: rows, total, unreadCounts },
    })
  },
)

function emptyUnreadCounts(): Record<InboxItemType, number> {
  return {
    event_flag: 0,
    price_submission: 0,
    blocked_venue: 0,
    crawl_failure: 0,
  }
}

// Compute per-category unread counts across the full inbox, one query per
// category. A category's item is unread when it has no inbox_reads row for its
// occurrence AND its sourceCreatedAt is not covered by the category watermark.
async function computeUnreadCounts(): Promise<Record<InboxItemType, number>> {
  const counts = emptyUnreadCounts()
  await Promise.all(
    INBOX_CATEGORIES.map(async (cat) => {
      const sub = categorySubquery(cat).as('cat')
      const isReadExpr = sql<boolean>`(
        ${inboxReads.readAt} IS NOT NULL
        OR (
          ${inboxReadWatermarks.readUpTo} IS NOT NULL
          AND ${sub.sourceCreatedAt} <= ${inboxReadWatermarks.readUpTo}
        )
      )`
      const result = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(sub)
        .leftJoin(
          inboxReads,
          and(
            eq(inboxReads.itemType, sub.itemType),
            eq(inboxReads.itemId, sub.itemId),
            eq(inboxReads.sourceCreatedAt, sub.sourceCreatedAt),
          ),
        )
        .leftJoin(
          inboxReadWatermarks,
          eq(inboxReadWatermarks.itemType, sub.itemType),
        )
        .where(sql`NOT ${isReadExpr}`)
      counts[cat] = result[0]?.total ?? 0
    }),
  )
  return counts
}

function categorySubquery(cat: InboxItemType) {
  switch (cat) {
    case 'event_flag':
      return eventFlagSubquery()
    case 'price_submission':
      return priceSubmissionSubquery()
    case 'blocked_venue':
      return blockedVenueSubquery()
    case 'crawl_failure':
      return crawlFailureSubquery()
  }
}

const readBodySchema = z.object({
  itemType: inboxItemTypeSchema,
  itemId: z.string().min(1),
  // The client echoes back the sourceCreatedAt of the row it's marking, so the
  // mark targets that exact occurrence.
  sourceCreatedAt: z.string().datetime(),
})

// POST /v1/admin/inbox/read — mark a single occurrence read.
inboxAdminRouter.post(
  '/read',
  zValidator('json', readBodySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422)
    }
  }),
  async (ctx) => {
    const { itemType, itemId, sourceCreatedAt } = ctx.req.valid('json')
    const actor = getAuthUser(ctx)

    // First reader of that occurrence wins; subsequent reads no-op at the row
    // level and are captured only in audit_log.
    await db
      .insert(inboxReads)
      .values({
        itemType,
        itemId,
        sourceCreatedAt: new Date(sourceCreatedAt),
        readBy: actor.userId,
      })
      .onConflictDoNothing({
        target: [
          inboxReads.itemType,
          inboxReads.itemId,
          inboxReads.sourceCreatedAt,
        ],
      })

    ctx.set('auditActorId', actor.userId)
    ctx.set('auditAction', 'inbox.mark_read')
    ctx.set('auditTargetId', itemId)
    ctx.set('auditMeta', { itemType, sourceCreatedAt })

    return ctx.json({ success: true })
  },
)

const readAllBodySchema = z.object({
  category: inboxItemTypeSchema.optional(),
})

// POST /v1/admin/inbox/read-all — watermark upsert (O(1) per category).
inboxAdminRouter.post(
  '/read-all',
  zValidator('json', readAllBodySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422)
    }
  }),
  async (ctx) => {
    const { category } = ctx.req.valid('json')
    const actor = getAuthUser(ctx)
    const targets = category ? [category] : INBOX_CATEGORIES

    // Write the timestamps with the DB clock (now()), not app-side new Date(),
    // so read_up_to is compared against DB-originated sourceCreatedAt values on
    // the same clock. defaultNow() only fires on insert, so the update branch
    // must set updated_at explicitly.
    await Promise.all(
      targets.map((cat) =>
        db
          .insert(inboxReadWatermarks)
          .values({
            itemType: cat,
            readUpTo: sql`now()`,
            readBy: actor.userId,
          })
          .onConflictDoUpdate({
            target: inboxReadWatermarks.itemType,
            set: {
              readUpTo: sql`now()`,
              readBy: actor.userId,
              updatedAt: sql`now()`,
            },
          }),
      ),
    )

    ctx.set('auditActorId', actor.userId)
    ctx.set('auditAction', 'inbox.mark_all_read')
    ctx.set('auditMeta', { category: category ?? 'all' })

    return ctx.json({ success: true })
  },
)
