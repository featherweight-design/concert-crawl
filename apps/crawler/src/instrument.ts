import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  environment: process.env['SENTRY_ENVIRONMENT'] ?? 'local',
  tracesSampleRate: 0.1,
  enableLogs: true,
  beforeSendLog: (log) => {
    if (log.level === 'debug') return null
    return log
  },
})
