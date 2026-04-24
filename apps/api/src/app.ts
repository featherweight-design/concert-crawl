import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { registerRoutes } from './routes/index.js'

export function createApp() {
  const app = new Hono()

  app.use('*', logger())
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
