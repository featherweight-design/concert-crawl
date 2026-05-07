import { Hono } from 'hono'
import { cors } from 'hono/cors'
import * as Sentry from '@sentry/hono/node'
import { requestLogger } from '@concert-crawl/logger'
import { registerRoutes } from './routes/index.js'
import { apiLogger } from './lib/logger.js'

export function createApp() {
  const app = new Hono()

  app.use('*', requestLogger(apiLogger))
  app.use(
    '*',
    cors({
      origin: process.env['ALLOWED_ORIGIN'] ?? 'http://localhost:3000',
      credentials: true,
    }),
  )

  registerRoutes(app)

  app.onError((err, ctx) => {
    Sentry.captureException(err, {
      extra: { requestId: ctx.get('requestId') },
    })
    apiLogger.error({ err, requestId: ctx.get('requestId') }, 'Unhandled error')
    return ctx.json({ success: false, error: 'Internal server error' }, 500)
  })

  return app
}
