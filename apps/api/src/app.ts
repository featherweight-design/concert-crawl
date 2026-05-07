import { Hono } from 'hono'
import { cors } from 'hono/cors'
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

  return app
}
