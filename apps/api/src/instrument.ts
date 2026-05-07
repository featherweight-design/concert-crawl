import * as Sentry from '@sentry/hono/node'

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  environment: process.env['SENTRY_ENVIRONMENT'] ?? 'local',
  tracesSampleRate: 0.1,
})
