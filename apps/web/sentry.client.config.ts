import * as Sentry from '@sentry/nextjs'

import { beforeBreadcrumb, beforeSend } from './src/lib/sentry-redact'

Sentry.init({
  dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'],
  environment: process.env['NEXT_PUBLIC_SENTRY_ENVIRONMENT'] ?? 'local',
  tracesSampleRate: 0.1,
  enableLogs: true,
  beforeBreadcrumb,
  beforeSend,
})
