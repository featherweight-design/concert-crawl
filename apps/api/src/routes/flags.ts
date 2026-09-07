import { Hono } from 'hono'

import {
  FEATURE_FLAG_CACHE_TTL_MS,
  loadFeatureFlags,
} from '../lib/feature-flags.js'

export const flagsRouter = new Hono()

// Unauthenticated on purpose: logged-out surfaces need the same answer, and
// the keys are in the client bundle regardless. Only key and enabled ship —
// the registry's labels and descriptions carry roadmap intent and stay behind
// the admin endpoints.
flagsRouter.get('/', async (ctx) => {
  const flags = await loadFeatureFlags()
  ctx.header(
    'Cache-Control',
    `public, max-age=${FEATURE_FLAG_CACHE_TTL_MS / 1000}`,
  )
  return ctx.json({ success: true, data: flags })
})
