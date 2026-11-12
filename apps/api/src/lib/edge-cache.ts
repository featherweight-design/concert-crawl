import type { Context } from 'hono';

// The CDN window for a public read (perf audit rec 4). Short on purpose: several
// reads are relative to "today", and nothing purges the edge when an admin hides
// an event or a venue, so the longest a hidden show can stay visible is the two
// windows together, about twelve minutes. The stale window is what lets the edge
// answer at once while it refreshes behind the request.
export const PUBLIC_EDGE_CACHE =
  'public, s-maxage=120, stale-while-revalidate=600';

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

/**
 * The viewer-scoped split in one place: an answer a token can change is held by
 * no shared cache (`private, no-store`), an anonymous one may be held. Call it
 * only on a 2xx answer, after the reads.
 */
export const markViewerScopedRead = (ctx: Context, isAuthed: boolean): void => {
  if (isAuthed) {
    ctx.header('Vary', 'Authorization', { append: true });
    ctx.header('Cache-Control', 'private, no-store');
  } else {
    markPublicRead(ctx);
  }
};
