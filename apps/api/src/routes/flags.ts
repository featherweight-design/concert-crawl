import { getAuth } from '@hono/clerk-auth';
import { Hono } from 'hono';

import {
  FEATURE_FLAG_CACHE_TTL_MS,
  loadFeatureFlags,
} from '../lib/feature-flags.js';
import { flagViewerFrom } from '../lib/flag-ladder.js';

export const flagsRouter = new Hono();

// Open to logged-out visitors on purpose: their surfaces need an answer too,
// and the keys are in the client bundle regardless. The answer depends on who
// is asking (a flag at Me or Beta is on for some people only), so a signed-in
// caller gets their own map and it must never be shared: `private`, varying on
// the credential. A logged-out caller gets the Everyone-only map, which is the
// same for all of them and stays publicly cacheable. Only key and enabled ship
// — the registry's labels and descriptions carry roadmap intent and stay
// behind the admin endpoints.
flagsRouter.get('/', async (ctx) => {
  const viewer = flagViewerFrom(getAuth(ctx));
  const flags = await loadFeatureFlags(viewer);
  const maxAge = Math.floor(FEATURE_FLAG_CACHE_TTL_MS / 1000);
  ctx.header(
    'Cache-Control',
    `${viewer === null ? 'public' : 'private'}, max-age=${maxAge}`,
  );
  ctx.header('Vary', 'Authorization');
  return ctx.json({ success: true, data: flags });
});
