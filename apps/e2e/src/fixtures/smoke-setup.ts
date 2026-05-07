import * as Sentry from '@sentry/node'
import type { FullConfig } from '@playwright/test'

export default async function globalSetup(_config: FullConfig): Promise<void> {
  if (process.env['SENTRY_DSN']) {
    Sentry.init({
      dsn: process.env['SENTRY_DSN'],
      environment: 'production',
      initialScope: {
        tags: { source: 'smoke-test' },
      },
    })
    console.log('[smoke] Sentry initialized for failure reporting')
  }
}
