import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
config({ path: fileURLToPath(new URL('../.env.local', import.meta.url)) })

import * as Sentry from '@sentry/node'

const environment = process.env['SENTRY_ENVIRONMENT']?.trim() || 'local'

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  environment,
  // See apps/api/src/instrument.ts — local runs never send, so dev noise
  // cannot bury real production errors.
  enabled: environment !== 'local',
  tracesSampleRate: 0.1,
  enableLogs: true,
})
