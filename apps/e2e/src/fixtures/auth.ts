import { chromium, type FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * Logs in via the Clerk sign-in flow and writes the browser storage state to
 * `outputPath`. Both `email` and `password` must be non-empty — the function
 * throws immediately if either is missing so the caller gets a clear error
 * rather than a confusing Playwright timeout.
 *
 * A new browser + page is spun up internally and torn down when done, so
 * callers do not need to manage a browser lifecycle.
 */
export async function loginAndSave(
  email: string,
  password: string,
  outputPath: string,
  baseURL: string,
): Promise<void> {
  // Trim before the required-check so whitespace-only inputs (e.g. an env
  // var set to a stray space) fail fast with a clear error instead of
  // driving the browser and timing out at the Clerk password field.
  const trimmedEmail = email.trim()
  const trimmedPassword = password.trim()
  if (trimmedEmail === '') {
    throw new Error('loginAndSave: email required')
  }
  if (trimmedPassword === '') {
    throw new Error('loginAndSave: password required')
  }

  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    await page.goto(`${baseURL}/sign-in`)
    await page.waitForLoadState('networkidle')

    await page.getByLabel(/email/i).fill(trimmedEmail)
    // `exact: true` is required because Clerk renders a "Sign in with
    // Google" OAuth button whose accessible name resolves to "Sign in
    // with Google Continue" — a substring match on /continue/i hits
    // both buttons and trips Playwright's strict-mode check.
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.waitForLoadState('networkidle')

    // Target by `name` attribute, not label. `getByLabel(/password/i)`
    // also matches Clerk's "Show password" toggle button (aria-label
    // "Show password"), tripping strict mode. Playwright's `fill()`
    // auto-waits for the input to become enabled — Clerk renders the
    // field `disabled` for a beat after the email-step transition.
    await page.locator('input[name="password"]').fill(trimmedPassword)
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    await page.waitForURL((url) => !url.pathname.includes('sign-in'), {
      timeout: 15_000,
    })

    const outputDir = path.dirname(outputPath)
    fs.mkdirSync(outputDir, { recursive: true })

    await page.context().storageState({ path: outputPath })
    console.log('[e2e] Auth state saved to', outputPath)
  } finally {
    await browser.close()
  }
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const email = process.env['E2E_TEST_USER_EMAIL']
  const password = process.env['E2E_TEST_USER_PASSWORD']

  const authDir = path.resolve('.auth')
  const authFile = path.join(authDir, 'user.json')
  fs.mkdirSync(authDir, { recursive: true })

  // Trim before the missing check so a whitespace-only env var takes the
  // documented "creds-missing → warn + write empty storage state" path
  // instead of falling through to loginAndSave (which trims and throws).
  // Preserves the pre-refactor behavior for the still-common case of
  // running the e2e suite without Clerk creds configured.
  const trimmedEmail = email?.trim() ?? ''
  const trimmedPassword = password?.trim() ?? ''

  if (trimmedEmail === '' || trimmedPassword === '') {
    console.warn(
      '[e2e] E2E_TEST_USER_EMAIL or E2E_TEST_USER_PASSWORD not set — skipping auth setup.',
    )
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3000'
  await loginAndSave(trimmedEmail, trimmedPassword, authFile, baseURL)
}
