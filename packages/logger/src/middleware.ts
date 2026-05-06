import type { MiddlewareHandler } from 'hono'
import type { Logger } from 'pino'

export function requestLogger(logger: Logger): MiddlewareHandler {
  return async (c, next) => {
    // Preserve any requestId set by upstream middleware (e.g. a gateway)
    if (!c.get('requestId')) {
      c.set('requestId', crypto.randomUUID())
    }

    const start = Date.now()
    await next()
    const durationMs = Date.now() - start

    logger.info({
      requestId: c.get('requestId'),
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs,
    })
  }
}
