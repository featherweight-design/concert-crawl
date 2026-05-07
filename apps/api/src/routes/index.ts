import type { Hono } from 'hono'
import { healthRouter } from './health.js'
import { adminRouter } from './admin/index.js'
import { eventsRouter } from './events.js'
import { venuesPublicRouter } from './venues-public.js'
import { priceSubmissionsRouter } from './price-submissions.js'

export function registerRoutes(app: Hono) {
  app.route('/v1/health', healthRouter)
  app.route('/v1/admin', adminRouter)
  app.route('/v1/events', eventsRouter)
  app.route('/v1/events', priceSubmissionsRouter)
  app.route('/v1/venues', venuesPublicRouter)
}
