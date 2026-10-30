import { chromium, type FullConfig, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * The one spelling of the storage-state path. Playwright resolves a relative
 * `storageState` against the config directory, and globalSetup writes with
 * `path.resolve` from the same cwd, so a single relative string is correct for
 * both — but only if there is exactly one of them. A second spelling
 * (`playwright/.auth/user.json`) silently ENOENT'd four specs for months.
 */
export const STORAGE_STATE_PATH = '.auth/user.json'

/**
 * The same rule for the other two suites: the smoke config and the audit sweep
 * each have a reader and a writer that must agree on a path, so the path is
 * declared once here rather than twice at each site.
 */
export const SMOKE_STORAGE_STATE_PATH = '.auth/smoke.json'

export const auditStorageStatePath = (role: 'user' | 'admin'): string =>
  `.auth/audit-${role}.json`

/**
 * Completes the Clerk sign-in form on `page`, which must already be on
 * `/sign-in`, and resolves once the browser holds a Clerk session.
 *
 * Every wait is on a concrete element or state, never on a load state. Next 16
 * holds a proxy-redirected RSC prefetch open, so `networkidle` never arrives,
 * and the post-sign-in landing never reached `load` within the timeout either.
 * What storage state needs is the session cookie, so that is what this waits
 * for. Shared by the e2e and smoke global setups so the two cannot drift.
 */
export async function signInWithClerk(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  const emailInput = page.getByLabel(/email/i)
  await emailInput.waitFor({ state: 'visible', timeout: 30_000 })
  await emailInput.fill(email)
  // `exact: true` is required because Clerk renders a "Sign in with
  // Google" OAuth button whose accessible name resolves to "Sign in
  // with Google Continue" — a substring match on /continue/i hits
  // both buttons and trips Playwright's strict-mode check.
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  // Target by `name` attribute, not label. `getByLabel(/password/i)`
  // also matches Clerk's "Show password" toggle button (aria-label
  // "Show password"), tripping strict mode. Playwright's `fill()`
  // auto-waits for the input to become enabled — Clerk renders the
  // field `disabled` for a beat after the email-step transition.
  const passwordInput = page.locator('input[name="password"]')
  await passwordInput.waitFor({ state: 'visible', timeout: 30_000 })
  await passwordInput.fill(password)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  // `commit`, not the default `load`: leaving /sign-in is the signal here, and
  // the session cookie below is the state the caller actually needs.
  await page.waitForURL((url) => !url.pathname.includes('sign-in'), {
    timeout: 15_000,
    waitUntil: 'commit',
  })
  await waitForSessionCookie(page, 15_000)
}

/**
 * Resolves once the page's context holds a Clerk `__session` cookie (Clerk may
 * suffix the name per instance), and throws if none appears in `timeoutMs`.
 */
export async function waitForSessionCookie(
  page: Page,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const cookies = await page.context().cookies()
    if (cookies.some((cookie) => cookie.name.startsWith('__session'))) return
    if (Date.now() >= deadline) {
      throw new Error(
        `waitForSessionCookie: no Clerk __session cookie within ${timeoutMs}ms`,
      )
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

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
    await signInWithClerk(page, trimmedEmail, trimmedPassword)

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

  const authFile = path.resolve(STORAGE_STATE_PATH)
  const authDir = path.dirname(authFile)
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
