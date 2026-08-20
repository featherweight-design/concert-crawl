import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requestLogger } from '@concert-crawl/logger'
import { registerRoutes } from './routes/index.js'
import { apiLogger } from './lib/logger.js'
import { errorHandler } from './lib/error-handler.js'

export function createApp() {
  const app = new Hono()

  app.use('*', requestLogger(apiLogger))
  app.use(
    '*',
    cors({
      origin: process.env['ALLOWED_ORIGIN'] ?? 'http://localhost:3000',
      credentials: true,
      // Web and API are separate origins, so any response header outside the
      // CORS safelist is invisible to the browser unless named here. Without
      // Retry-After the export row cannot read the real wait off a 429 and
      // silently falls back to a flat hour.
      exposeHeaders: ['Retry-After'],
    }),
  )

  registerRoutes(app)

  app.onError(errorHandler)

  return app
}
