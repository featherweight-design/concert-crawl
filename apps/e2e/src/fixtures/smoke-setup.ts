import * as Sentry from '@sentry/node'
import { chromium, type FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// Writes the storage state Playwright loads via `use.storageState`.
// When no credentials are supplied (e.g. local dry-runs) we still
// need the file to exist so Playwright can boot; an empty
// `{ cookies, origins }` document satisfies that without granting
// any session.
function writeEmptyStorageState(filePath: string): void {
  fs.writeFileSync(filePath, JSON.stringify({ cookies: [], origins: [] }))
}

export default async function globalSetup(config: FullConfig): Promise<void> {
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

  const email = process.env['E2E_TEST_USER_EMAIL']
  const password = process.env['E2E_TEST_USER_PASSWORD']

  const authDir = path.resolve('.auth')
  const authFile = path.join(authDir, 'smoke.json')
  fs.mkdirSync(authDir, { recursive: true })

  if (!email || !password) {
    console.warn(
      '[smoke] E2E_TEST_USER_EMAIL or E2E_TEST_USER_PASSWORD not set — running unauthenticated. Auth-gated routes will fail.',
    )
    writeEmptyStorageState(authFile)
    return
  }

  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3000'
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    await page.goto(`${baseURL}/sign-in`)
    await page.waitForLoadState('networkidle')

    await page.getByLabel(/email/i).fill(email)
    // `exact: true` is required because Clerk renders a "Sign in with
    // Google" OAuth button whose accessible name resolves to "Sign in
    // with Google Continue" — a substring match on /continue/i hits
    // both buttons and trips Playwright's strict-mode check.
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.waitForLoadState('networkidle')

    await page.getByLabel(/password/i).fill(password)
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    await page.waitForURL((url) => !url.pathname.includes('sign-in'), {
      timeout: 15_000,
    })

    await page.context().storageState({ path: authFile })
    console.log('[smoke] Auth state saved to', authFile)
  } catch (error) {
    // Sign-in failure must FAIL the suite — silently writing an empty
    // state and continuing would make every auth-gated spec fail
    // downstream with confusing selector errors instead of pointing
    // at the real cause.
    console.error('[smoke] Sign-in flow failed:', error)
    throw error
  } finally {
    await browser.close()
  }
}
