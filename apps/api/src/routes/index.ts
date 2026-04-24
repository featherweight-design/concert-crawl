import type { Hono } from 'hono'
import { healthRouter } from './health.js'
import { adminRouter } from './admin/index.js'

export function registerRoutes(app: Hono) {
  app.route('/v1/health', healthRouter)
  app.route('/v1/admin', adminRouter)
}
