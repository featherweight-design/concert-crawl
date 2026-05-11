import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
config({ path: fileURLToPath(new URL('../.env.local', import.meta.url)) })

import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  environment: process.env['SENTRY_ENVIRONMENT'] ?? 'local',
  tracesSampleRate: 0.1,
  enableLogs: true,
})
