import type { Hono } from 'hono'
import { healthRouter } from './health.js'
import { adminRouter } from './admin/index.js'
import { eventsRouter } from './events.js'
import { venuesPublicRouter } from './venues-public.js'
import { artistsPublicRouter } from './artists-public.js'
import { artistFollowsRouter, meArtistFollowsRouter } from './artist-follows.js'
import { priceSubmissionsRouter } from './price-submissions.js'
import { priceSubmissionConfirmsRouter } from './price-submission-confirms.js'
import { priceSubmissionStillAccurateRouter } from './price-submission-still-accurate.js'
import { eventReportsRouter } from './event-reports.js'
import { submissionsRouter } from './submissions.js'
import { waitlistRouter } from './waitlist.js'
import { authRouter } from './auth/index.js'
import { usersRouter } from './users.js'
import { usersExportRouter } from './users-export.js'
import { watchingRouter } from './watching.js'
import { attendingRouter } from './attending.js'
import { historyRouter } from './history.js'
import { crewsRouter } from './crews.js'
import { crewInvitesRouter } from './crew-invites.js'
import { feedbackRouter } from './feedback.js'
import { flagsRouter } from './flags.js'
import { searchRouter } from './search.js'
import { spotifyRouter } from './spotify.js'
import { mePushRouter } from './me-push.js'
import { notificationsRouter } from './notifications.js'
import { emailUnsubscribeRouter } from './email-unsubscribe.js'
import { createBillingRouter } from './billing.js'
import { createBillingManageRouter } from './billing-manage.js'
import { createBillingLifecycleRouter } from './billing-lifecycle.js'
import { createFounderWindowRouter } from './billing-founder-window.js'
import { createBillingNudgesRouter } from './billing-nudges.js'
import { createStripeWebhooksRouter } from './stripe-webhooks.js'
import { createInternalCronRouter } from './internal-cron.js'
import { getStripeClient } from '../lib/stripe.js'

export function registerRoutes(app: Hono) {
  // Mounted FIRST and with no Clerk/audit middleware — Stripe signature
  // verification needs the raw body and the request is not user-initiated
  // (eng infra spec Part 2 §1.5).
  app.route('/v1/webhooks/stripe', createStripeWebhooksRouter(getStripeClient))
  app.route('/v1/health', healthRouter)
  // Scheduled-job triggers, authed by CRON_SECRET and 404 when it is unset.
  // No Clerk/audit middleware: the caller is the host's scheduler, not a user.
  app.route('/v1/internal/cron', createInternalCronRouter())
  app.route('/v1/admin', adminRouter)
  app.route('/v1/events', eventsRouter)
  app.route('/v1/events', priceSubmissionsRouter)
  app.route('/v1/events', priceSubmissionConfirmsRouter)
  app.route('/v1/events', priceSubmissionStillAccurateRouter)
  app.route('/v1/events', eventReportsRouter)
  app.route('/v1/venues', venuesPublicRouter)
  // Follow mounts FIRST so its auth-gated POST/DELETE handlers win over the
  // public read router, which must stay free of a 401 guard (#1115 PR-D).
  app.route('/v1/artists', artistFollowsRouter)
  app.route('/v1/artists', artistsPublicRouter)
  app.route('/v1/submissions', submissionsRouter)
  app.route('/v1/waitlist', waitlistRouter)
  app.route('/v1/auth', authRouter)
  app.route('/v1/users', usersRouter)
  app.route('/v1/users', usersExportRouter)
  app.route('/v1/watching', watchingRouter)
  app.route('/v1/attending', attendingRouter)
  app.route('/v1/history', historyRouter)
  app.route('/v1/crews', crewsRouter)
  app.route('/v1/crew-invites', crewInvitesRouter)
  app.route('/v1/feedback', feedbackRouter)
  app.route('/v1/flags', flagsRouter)
  app.route('/v1/search', searchRouter)
  app.route('/v1/spotify', spotifyRouter)
  app.route('/v1/me', mePushRouter)
  app.route('/v1/me', meArtistFollowsRouter)
  // Viewer-scoped collection, so no `/me` prefix — same shape as /v1/watching.
  app.route('/v1/notifications', notificationsRouter)
  // Signed one-click unsubscribe — no auth by design (#763 §8.2).
  app.route('/v1/email', emailUnsubscribeRouter)
  app.route('/v1/billing', createBillingRouter(getStripeClient))
  app.route('/v1/billing', createBillingManageRouter(getStripeClient))
  app.route('/v1/billing', createBillingLifecycleRouter(getStripeClient))
  app.route('/v1/billing', createFounderWindowRouter())
  app.route('/v1/billing', createBillingNudgesRouter())
}
