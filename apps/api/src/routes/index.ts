import type { Hono } from 'hono'
import { healthRouter } from './health.js'

export function registerRoutes(app: Hono) {
  app.route('/v1/health', healthRouter)
}
