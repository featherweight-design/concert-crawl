import type { Context, ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { matchedRoutes } from 'hono/route';
import { getAuth } from '@hono/clerk-auth';
import * as Sentry from '@sentry/hono/node';
import { sentryTier, sentryUserHash } from '@concert-crawl/types/sentry-tags';
import { apiLogger } from './logger.js';

// Hono raises HTTPException for failures the caller caused — most commonly a
// 400 from zValidator when the request body isn't parseable JSON. Treating
// those like server faults did two harmful things: it filed them in Sentry at
// error level (drowning real faults and tripping the sustained-error-volume
// monitor), and it flattened the response to a 500, telling the client the
// server had broken when the request was at fault. 5xx HTTPExceptions still
// reach Sentry, since those do indicate something on our side failed.
//
// The Sentry event carries searchable tags: `route` (the route pattern, never
// the raw URL, so ids in a path stay out), `tier` (from the session claim, no
// lookup) and `userHash` (a keyed hash; the raw Clerk id is never a tag).
export const errorHandler: ErrorHandler = async (err, ctx) => {
  const requestId = ctx.get('requestId');

  if (err instanceof HTTPException && err.status < 500) {
    apiLogger.warn({ err, requestId, status: err.status }, 'Client error');
    return ctx.json({ success: false, error: err.message }, err.status);
  }

  const tags = await requestTags(ctx);
  Sentry.withScope((scope) => {
    scope.setTags(tags);
    Sentry.captureException(err, { extra: { requestId } });
  });
  apiLogger.error({ err, requestId }, 'Unhandled error');
  return ctx.json({ success: false, error: 'Internal server error' }, 500);
};

// The searchable tags for an unhandled error. Best effort: tagging must never
// cost the error itself, so a failure anywhere in it (the auth context, a
// malformed hash key, crypto rejecting) yields no tags and the caller still
// captures and logs the original error.
async function requestTags(ctx: Context): Promise<Record<string, string>> {
  try {
    const auth = getAuth(ctx);
    const userHash = await sentryUserHash(
      auth?.userId,
      process.env['SENTRY_USER_HASH_KEY'],
    );
    const route = routePattern(ctx);
    return {
      ...(route ? { route } : {}),
      tier: sentryTier(auth?.sessionClaims),
      ...(userHash ? { userHash } : {}),
    };
  } catch {
    return {};
  }
}

// The pattern of the route that handled the request (`/v1/events/:id`), not
// the URL. Middleware registered as `/*` also matches, so the last non-wildcard
// match is the handler's; no such match (a 404 path) leaves the tag off.
function routePattern(ctx: Context): string | undefined {
  const match = matchedRoutes(ctx)
    .map((route) => route.path)
    .filter((path) => path !== '/*' && path !== '*')
    .at(-1);
  return match;
}
