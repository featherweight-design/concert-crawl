import type { MiddlewareHandler } from 'hono'
import type { Logger } from 'pino'

export function requestLogger(logger: Logger): MiddlewareHandler {
  return async (ctx, next) => {
    // Preserve any requestId set by upstream middleware (e.g. a gateway)
    if (!ctx.get('requestId')) {
      ctx.set('requestId', crypto.randomUUID())
    }

    const start = Date.now()
    await next()
    const durationMs = Date.now() - start

    logger.info({
      requestId: ctx.get('requestId'),
      method: ctx.req.method,
      path: ctx.req.path,
      status: ctx.res.status,
      durationMs,
    })
  }
}
