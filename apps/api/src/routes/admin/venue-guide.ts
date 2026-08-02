import { Hono, type Context } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, venueGuideChips, venues } from '@concert-crawl/db'
import { and, eq, inArray } from 'drizzle-orm'
import {
  GUIDE_CHIP_ORDER,
  GUIDE_FIELD_MAX_LENGTH,
  deriveChipState,
  deriveGuidePublishState,
  isGuideChipKey,
  type GuideChipKey,
  type VenueGuide,
  type VenueGuideChip,
} from '@concert-crawl/types'
import { getAuthUser } from '../../middleware/auth.js'
import type { AdminVariables } from './index.js'

// #764 admin authoring surface for the venue first-timer guide.
//
// Mounted from admin/venues.ts at `/:id/guide` — kept in its own file because
// admin/venues.ts is already ~900 lines and this is a distinct resource with
// its own publish gate.
//
// The publish gate is NOT re-implemented here: `deriveGuidePublishState` in
// packages/types is the single implementation, shared with the admin badge in
// apps/web, so the client can never show "Ready" for something we'd reject.

export const venueGuideAdminRouter = new Hono<AdminVariables>()

/** Trim, and treat an empty/whitespace-only string as an explicit clear. */
const nullableTrimmedText = z
  .string()
  .max(GUIDE_FIELD_MAX_LENGTH)
  .nullable()
  .optional()
  .transform((val) => {
    if (val == null) return val
    const trimmed = val.trim()
    return trimmed === '' ? null : trimmed
  })

const guideChipSchema = z.object({
  chipType: z.enum(GUIDE_CHIP_ORDER),
  body: z.string().max(GUIDE_FIELD_MAX_LENGTH),
  isPlaceholder: z.boolean().default(false),
})

export const saveGuideSchema = z
  .object({
    insiderTip: nullableTrimmedText,
    chips: z.array(guideChipSchema).max(GUIDE_CHIP_ORDER.length),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>()
    value.chips.forEach((chip, index) => {
      if (seen.has(chip.chipType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['chips', index, 'chipType'],
          message: `Duplicate chip: ${chip.chipType}`,
        })
      }
      seen.add(chip.chipType)

      // The honest placeholder is an accessibility-only state — it exists to
      // satisfy the publish gate without faking content. The DB CHECK enforces
      // the same invariant; this gives a 400 instead of a 500.
      if (chip.isPlaceholder && chip.chipType !== 'accessibility') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['chips', index, 'isPlaceholder'],
          message: 'Only the accessibility chip can be a placeholder',
        })
      }
    })
  })

const venueIdParamSchema = z.object({ id: z.string().uuid() })

/**
 * Hono cannot infer the parent's `:id` through the mount, so `zValidator('param')`
 * would type it as never — the id is parsed off the raw params instead, which
 * validates it just as strictly without a cast. A malformed id 404s rather than
 * 400s: it is indistinguishable from a venue that does not exist, and the
 * handlers' own not-found branch already says exactly that.
 */
const readVenueId = (ctx: Context): string | null => {
  const parsed = venueIdParamSchema.safeParse(ctx.req.param())
  return parsed.success ? parsed.data.id : null
}

interface VenueGuideRow {
  insiderTip: string | null
  guidePublishedAt: Date | null
}

async function loadVenueGuideRow(
  venueId: string,
): Promise<VenueGuideRow | undefined> {
  const [row] = await db
    .select({
      insiderTip: venues.insiderTip,
      guidePublishedAt: venues.guidePublishedAt,
    })
    .from(venues)
    .where(eq(venues.id, venueId))
  return row
}

/**
 * Rows are ordered by GUIDE_CHIP_ORDER in application code — there is
 * deliberately no sort_order column (per-venue reordering was never a
 * designed affordance). Rows whose chip_type is not in the current pool
 * (e.g. a #997 key promoted then rolled back) are skipped rather than
 * crashing the read.
 */
async function loadChips(venueId: string): Promise<VenueGuideChip[]> {
  const rows = await db
    .select({
      chipType: venueGuideChips.chipType,
      body: venueGuideChips.body,
      isPlaceholder: venueGuideChips.isPlaceholder,
    })
    .from(venueGuideChips)
    .where(eq(venueGuideChips.venueId, venueId))

  const byKey = new Map<GuideChipKey, VenueGuideChip>()
  for (const row of rows) {
    if (!isGuideChipKey(row.chipType)) continue
    byKey.set(row.chipType, {
      chipType: row.chipType,
      body: row.body,
      isPlaceholder: row.isPlaceholder,
    })
  }

  return GUIDE_CHIP_ORDER.map((key) => byKey.get(key)).filter(
    (chip): chip is VenueGuideChip => chip !== undefined,
  )
}

async function buildGuide(
  venueId: string,
  row: VenueGuideRow,
): Promise<VenueGuide> {
  return {
    chips: await loadChips(venueId),
    insiderTip: row.insiderTip,
    publishedAt: row.guidePublishedAt?.toISOString() ?? null,
  }
}

function accessibilityGateInput(chips: VenueGuideChip[]): {
  accessibilityBody: string
  accessibilityPlaceholder: boolean
} {
  const accessibility = chips.find((chip) => chip.chipType === 'accessibility')
  return {
    accessibilityBody: accessibility?.body ?? '',
    accessibilityPlaceholder: accessibility?.isPlaceholder ?? false,
  }
}

// GET /v1/admin/venues/:id/guide
venueGuideAdminRouter.get('/', async (ctx) => {
  const id = readVenueId(ctx)
  if (!id) {
    return ctx.json({ success: false, error: 'Venue not found' }, 404)
  }

  const row = await loadVenueGuideRow(id)
  if (!row) {
    return ctx.json({ success: false, error: 'Venue not found' }, 404)
  }

  return ctx.json({ success: true, data: await buildGuide(id, row) })
})

// PUT /v1/admin/venues/:id/guide — save draft. Never touches guidePublishedAt.
venueGuideAdminRouter.put(
  '/',
  zValidator('json', saveGuideSchema),
  async (ctx) => {
    const id = readVenueId(ctx)
    if (!id) {
      return ctx.json({ success: false, error: 'Venue not found' }, 404)
    }
    const body = ctx.req.valid('json')

    const row = await loadVenueGuideRow(id)
    if (!row) {
      return ctx.json({ success: false, error: 'Venue not found' }, 404)
    }

    // `blank` is the absence of a row, so a selected-but-empty chip is simply
    // not persisted. A placeholder always stores an empty body — a leftover
    // draft must never leak into the display state.
    const persistable = body.chips
      .map((chip) => ({
        chipType: chip.chipType,
        body: chip.isPlaceholder ? '' : chip.body.trim(),
        isPlaceholder: chip.isPlaceholder,
      }))
      .filter((chip) => chip.isPlaceholder || chip.body.length > 0)

    const insiderTip = body.insiderTip ?? null

    await db.transaction(async (tx) => {
      // Scoped to the keys this endpoint can author. `chip_type` is a plain
      // text column, so a bare venue-wide delete would silently drop rows a
      // newer deploy or a #997 key wrote — rows the read path already skips
      // rather than crashing on, and which this admin never saw to re-send.
      await tx
        .delete(venueGuideChips)
        .where(
          and(
            eq(venueGuideChips.venueId, id),
            inArray(venueGuideChips.chipType, [...GUIDE_CHIP_ORDER]),
          ),
        )
      if (persistable.length > 0) {
        await tx
          .insert(venueGuideChips)
          .values(persistable.map((chip) => ({ ...chip, venueId: id })))
      }
      await tx
        .update(venues)
        .set({ insiderTip, updatedAt: new Date() })
        .where(eq(venues.id, id))
    })

    const accessibility = persistable.find(
      (chip) => chip.chipType === 'accessibility',
    )

    ctx.set('auditAction', 'venue.guide.save')
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', getAuthUser(ctx).userId)
    ctx.set('auditMeta', {
      chipCount: persistable.length,
      hasInsiderTip: insiderTip !== null,
      accessibilityState: deriveChipState(accessibility),
    })

    return ctx.json({
      success: true,
      data: await buildGuide(id, { ...row, insiderTip }),
    })
  },
)

// POST /v1/admin/venues/:id/guide/publish
venueGuideAdminRouter.post('/publish', async (ctx) => {
  const id = readVenueId(ctx)
  if (!id) {
    return ctx.json({ success: false, error: 'Venue not found' }, 404)
  }

  const row = await loadVenueGuideRow(id)
  if (!row) {
    return ctx.json({ success: false, error: 'Venue not found' }, 404)
  }

  // Re-derive the gate against the PERSISTED rows, never the request body —
  // a hand-rolled request must not be able to bypass it.
  const chips = await loadChips(id)
  const publishState = deriveGuidePublishState(accessibilityGateInput(chips))

  if (publishState.kind === 'blocked') {
    return ctx.json(
      {
        success: false,
        error:
          'Accessibility is required to publish — author it or mark it not-yet-documented.',
        field: 'accessibility',
      },
      400,
    )
  }

  const guidePublishedAt = new Date()
  await db.update(venues).set({ guidePublishedAt }).where(eq(venues.id, id))

  ctx.set('auditAction', 'venue.guide.publish')
  ctx.set('auditTargetId', id)
  ctx.set('auditActorId', getAuthUser(ctx).userId)
  ctx.set('auditMeta', { publishState: publishState.kind })

  return ctx.json({
    success: true,
    data: {
      chips,
      insiderTip: row.insiderTip,
      publishedAt: guidePublishedAt.toISOString(),
    },
  })
})

// POST /v1/admin/venues/:id/guide/unpublish — retract a live guide.
//
// Not in the design handoff: the gate only ever set guidePublishedAt, which
// left a published-by-mistake guide retractable only by hand-written SQL
// against production. Idempotent by design — unpublishing an already-draft
// guide is a 200 no-op, not an error.
venueGuideAdminRouter.post('/unpublish', async (ctx) => {
  const id = readVenueId(ctx)
  if (!id) {
    return ctx.json({ success: false, error: 'Venue not found' }, 404)
  }

  const row = await loadVenueGuideRow(id)
  if (!row) {
    return ctx.json({ success: false, error: 'Venue not found' }, 404)
  }

  const wasPublished = row.guidePublishedAt !== null
  if (wasPublished) {
    await db
      .update(venues)
      .set({ guidePublishedAt: null })
      .where(eq(venues.id, id))
  }

  ctx.set('auditAction', 'venue.guide.unpublish')
  ctx.set('auditTargetId', id)
  ctx.set('auditActorId', getAuthUser(ctx).userId)
  ctx.set('auditMeta', { wasPublished })

  return ctx.json({
    success: true,
    data: await buildGuide(id, { ...row, guidePublishedAt: null }),
  })
})
