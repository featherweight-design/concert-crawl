import type { Hono } from 'hono'
import { healthRouter } from './health.js'
import { adminRouter } from './admin/index.js'
import { eventsRouter } from './events.js'
import { venuesPublicRouter } from './venues-public.js'
import { priceSubmissionsRouter } from './price-submissions.js'
import { priceSubmissionConfirmsRouter } from './price-submission-confirms.js'
import { eventReportsRouter } from './event-reports.js'
import { submissionsRouter } from './submissions.js'
import { waitlistRouter } from './waitlist.js'
import { authRouter } from './auth/index.js'
import { usersRouter } from './users.js'
import { watchingRouter } from './watching.js'
import { feedbackRouter } from './feedback.js'
import { searchRouter } from './search.js'
import { createBillingRouter } from './billing.js'
import { createBillingManageRouter } from './billing-manage.js'
import { createFounderWindowRouter } from './billing-founder-window.js'
import { createBillingNudgesRouter } from './billing-nudges.js'
import { createStripeWebhooksRouter } from './stripe-webhooks.js'
import { getStripeClient } from '../lib/stripe.js'

export function registerRoutes(app: Hono) {
  // Mounted FIRST and with no Clerk/audit middleware — Stripe signature
  // verification needs the raw body and the request is not user-initiated
  // (eng infra spec Part 2 §1.5).
  app.route('/v1/webhooks/stripe', createStripeWebhooksRouter(getStripeClient))
  app.route('/v1/health', healthRouter)
  app.route('/v1/admin', adminRouter)
  app.route('/v1/events', eventsRouter)
  app.route('/v1/events', priceSubmissionsRouter)
  app.route('/v1/events', priceSubmissionConfirmsRouter)
  app.route('/v1/events', eventReportsRouter)
  app.route('/v1/venues', venuesPublicRouter)
  app.route('/v1/submissions', submissionsRouter)
  app.route('/v1/waitlist', waitlistRouter)
  app.route('/v1/auth', authRouter)
  app.route('/v1/users', usersRouter)
  app.route('/v1/watching', watchingRouter)
  app.route('/v1/feedback', feedbackRouter)
  app.route('/v1/search', searchRouter)
  app.route('/v1/billing', createBillingRouter(getStripeClient))
  app.route('/v1/billing', createBillingManageRouter(getStripeClient))
  app.route('/v1/billing', createFounderWindowRouter())
  app.route('/v1/billing', createBillingNudgesRouter())
}
