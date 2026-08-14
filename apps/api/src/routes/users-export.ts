import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { collectUserData } from '../lib/user-data.js'
import { checkRateLimit } from '../lib/rate-limit.js'

export const usersExportRouter = new Hono()

// The app mounts no global Clerk middleware — each authenticated router mounts
// its own, as usersRouter does. Without this, getAuth returns null and the
// route 401s for everyone.
usersExportRouter.use('*', clerkMiddleware())

const EXPORT_WINDOW_MS = 60 * 60 * 1000

// GET /v1/users/me/export — GDPR-style data export (#527).
//
// Synchronous JSON download rather than an emailed archive: at our data volume
// one user's rows are kilobytes, so a queue plus object storage would add two
// failure surfaces to buy nothing.
usersExportRouter.get('/me/export', async (ctx) => {
  const auth = getAuth(ctx)
  if (!auth?.userId) {
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  }

  // One query per exported table, so an unthrottled endpoint is a self-service
  // way to hammer the database.
  //
  // ⚠️ `checkRateLimit` is a process-local Map. With more than one API instance
  // the effective limit is one-per-hour PER INSTANCE. That is acceptable here:
  // the ceiling is still low and the endpoint is authenticated. When Gate B's
  // #528 lands a durable store, this call site inherits it for free — do not
  // build a bespoke one for this route.
  const limit = checkRateLimit(`export:${auth.userId}`, 1, EXPORT_WINDOW_MS)
  if (!limit.allowed) {
    ctx.header('Retry-After', String(Math.ceil(limit.retryAfterMs / 1000)))
    return ctx.json(
      {
        success: false,
        // No "try again shortly" — the wait is an hour, and Retry-After
        // already carries the exact number of seconds.
        error: 'You can request one export per hour.',
      },
      429,
    )
  }

  const data = await collectUserData(auth.userId)

  ctx.header('Content-Type', 'application/json; charset=utf-8')
  // This body is the single most sensitive response the API produces. Keep it
  // out of every cache between here and the browser.
  ctx.header('Cache-Control', 'private, no-store')
  // Fixed filename. A date-stamped name reads as helpful and is not: the
  // timestamp is already inside the payload as `exportedAt`.
  ctx.header(
    'Content-Disposition',
    'attachment; filename="concertcrawl-data-export.json"',
  )
  return ctx.body(
    JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2),
  )
})
