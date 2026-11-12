import * as Sentry from '@sentry/nextjs';
import { sentryTier, sentryUserHash } from '@concert-crawl/types/sentry-tags';

// Next loads this once per server runtime. Without it the server and edge
// Sentry configs never run, so server-rendered pages, route handlers and the
// proxy report nothing. Both configs spread SENTRY_PRIVACY_OPTIONS (every
// dataCollection switch off) and the web redaction hooks.
export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env['NEXT_RUNTIME'] === 'edge') {
    await import('../sentry.edge.config');
  }
}

// Reports errors thrown while rendering or handling a request, in either
// runtime, through the config register() loaded. The error's digest (the id
// the visitor's error page shows, and a problem report carries) is tagged on
// the event, so a report filed from that page can be searched straight to it.
// So is the route pattern (`/events/[id]`, never the URL, so an id in the path
// stays out of the tag).
export const onRequestError: typeof Sentry.captureRequestError = async (
  error,
  request,
  context,
) => {
  const digest =
    typeof error === 'object' && error !== null && 'digest' in error
      ? error.digest
      : undefined;
  const identity = await requestIdentityTags();
  Sentry.withScope((scope) => {
    if (typeof digest === 'string') scope.setTag('digest', digest);
    if (identity.tier) scope.setTag('tier', identity.tier);
    if (identity.userHash) scope.setTag('userHash', identity.userHash);
    scope.setTag('route', context.routePath);
    Sentry.captureRequestError(error, request, context);
  });
};

// The signed-in visitor's tier and keyed user hash, read only when an error is
// being reported, so no request pays for it. Best effort: Clerk's auth() needs
// the request context, which is not always reachable from here (and is absent
// when Clerk is not in play), so any failure leaves both tags off and never
// masks the error being reported. The key is server-only; with it unset there
// is no hash.
async function requestIdentityTags(): Promise<{
  tier?: string;
  userHash?: string | undefined;
}> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const { userId, sessionClaims } = await auth();
    if (!userId) return {};
    return {
      tier: sentryTier(sessionClaims),
      userHash: await sentryUserHash(
        userId,
        process.env['SENTRY_USER_HASH_KEY'],
      ),
    };
  } catch {
    return {};
  }
}
