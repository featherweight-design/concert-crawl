import * as Sentry from '@sentry/nextjs'

import { beforeBreadcrumb, beforeSend } from './src/lib/sentry-redact'

const environment = process.env['SENTRY_ENVIRONMENT']?.trim() || 'local'

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  environment,
  // See apps/api/src/instrument.ts — local runs never send, so dev noise
  // cannot bury real production errors.
  enabled: environment !== 'local',
  tracesSampleRate: 0.1,
  enableLogs: true,
  beforeBreadcrumb,
  beforeSend,
})
