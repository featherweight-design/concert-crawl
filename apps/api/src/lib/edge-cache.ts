import type { Context } from 'hono';

// The CDN window for a public read (perf audit rec 4). Short `s-maxage` because
// several reads are relative to "today"; the long stale window lets the edge
// answer at once while it refreshes behind the request.
export const PUBLIC_EDGE_CACHE =
  'public, s-maxage=300, stale-while-revalidate=3600';

/**
 * Let a shared cache hold this response. Call it only on a 2xx answer that is
 * the same for every visitor: never when a token changed the body (an overlay
 * such as `isWatching`), and never on an error. `Vary: Authorization` keeps a
 * signed-in caller's request from being answered with an anonymous entry, and
 * is appended so CORS's own `Vary` survives.
 */
export const markPublicRead = (ctx: Context): void => {
  ctx.header('Cache-Control', PUBLIC_EDGE_CACHE);
  ctx.header('Vary', 'Authorization', { append: true });
};
