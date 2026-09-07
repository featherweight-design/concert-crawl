import { db, featureFlags } from '@concert-crawl/db'
import {
  FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  isFeatureFlagKey,
  type AdminFeatureFlag,
} from '@concert-crawl/entitlements'
import { getAuth } from '@hono/clerk-auth'
import { Hono } from 'hono'
import { z } from 'zod'

import {
  clearFeatureFlagCache,
  loadFeatureFlags,
} from '../../lib/feature-flags.js'
import type { AdminVariables } from './index.js'

export const featureFlagsAdminRouter = new Hono<AdminVariables>()

const patchSchema = z.object({ enabled: z.boolean() })

featureFlagsAdminRouter.get('/', async (ctx) => {
  const [flags, rows] = await Promise.all([
    loadFeatureFlags(),
    db.select().from(featureFlags),
  ])
  const stored = new Map(rows.map((row) => [row.key, row]))

  const data: AdminFeatureFlag[] = FEATURE_FLAG_KEYS.map((key) => {
    const row = stored.get(key)
    return {
      key,
      label: FEATURE_FLAGS[key].label,
      description: FEATURE_FLAGS[key].description,
      enabled: flags[key],
      updatedAt: row?.updatedAt.toISOString() ?? null,
      updatedBy: row?.updatedBy ?? null,
    }
  })

  return ctx.json({ success: true, data })
})

featureFlagsAdminRouter.patch('/:key', async (ctx) => {
  const key = ctx.req.param('key')
  if (!isFeatureFlagKey(key)) {
    return ctx.json({ success: false, error: 'Unknown feature flag' }, 404)
  }

  const parsed = patchSchema.safeParse(await ctx.req.json().catch(() => null))
  if (!parsed.success) {
    return ctx.json({ success: false, error: 'enabled must be a boolean' }, 400)
  }

  const auth = getAuth(ctx)
  const actorId = auth?.userId ?? 'unknown'
  const { enabled } = parsed.data
  // Set explicitly in both branches: DEFAULT now() fires on insert only, so an
  // update that omitted it would freeze the timestamp at the first toggle.
  const updatedAt = new Date()

  const [row] = await db
    .insert(featureFlags)
    .values({ key, enabled, updatedAt, updatedBy: actorId })
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: { enabled, updatedAt, updatedBy: actorId },
    })
    .returning()

  if (!row) {
    return ctx.json({ success: false, error: 'Failed to save flag' }, 500)
  }

  // In-process only. Other instances converge within the loader's TTL, which
  // is the tolerance the 30s memo already accepts.
  clearFeatureFlagCache()

  ctx.set('auditAction', 'feature_flag.toggle')
  ctx.set('auditTargetId', `feature_flag:${key}`)
  ctx.set('auditActorId', actorId)
  ctx.set('auditMeta', { enabled })

  const data: AdminFeatureFlag = {
    key,
    label: FEATURE_FLAGS[key].label,
    description: FEATURE_FLAGS[key].description,
    enabled: row.enabled,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  }

  return ctx.json({ success: true, data })
})
