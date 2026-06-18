import * as Sentry from '@sentry/node'
import type { FullConfig } from '@playwright/test'

export default async function globalSetup(_config: FullConfig): Promise<void> {
  if (process.env['SENTRY_DSN']) {
    // Read SENTRY_ENVIRONMENT so staging-smoke and prod-smoke runs are
    // tagged distinctly in Sentry. Defaults to 'production' to preserve
    // behavior for the existing 6-hourly prod cron in smoke.yml, which
    // does not set the variable.
    const environment = process.env['SENTRY_ENVIRONMENT'] ?? 'production'
    Sentry.init({
      dsn: process.env['SENTRY_DSN'],
      environment,
      initialScope: {
        tags: { source: 'smoke-test' },
      },
    })
    console.log(
      `[smoke] Sentry initialized for failure reporting (environment=${environment})`,
    )
  }
}
