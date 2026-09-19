import { assertNotProdBaseUrl } from './assert-not-prod.js'
import { auditStorageStatePath, loginAndSave } from '../fixtures/auth.js'

/**
 * Logs in the requested fixture role and writes the Playwright storage state
 * to `.auth/audit-<role>.json`. Throws if the required env vars are not set,
 * or if PLAYWRIGHT_AUDIT_BASE_URL resolves to a production host (a mis-set
 * env var would otherwise log fixture creds into prod Clerk).
 *
 * Credentials come from env vars — never from CLI args or hardcoded values.
 *   user  → E2E_AUDIT_USER_EMAIL / E2E_AUDIT_USER_PASSWORD
 *   admin → E2E_AUDIT_ADMIN_EMAIL / E2E_AUDIT_ADMIN_PASSWORD
 *
 * Base URL defaults to staging and can be overridden via
 * PLAYWRIGHT_AUDIT_BASE_URL.
 */
export async function prepareAuditAuth(role: 'user' | 'admin'): Promise<void> {
  const emailVar =
    role === 'admin' ? 'E2E_AUDIT_ADMIN_EMAIL' : 'E2E_AUDIT_USER_EMAIL'
  const passwordVar =
    role === 'admin' ? 'E2E_AUDIT_ADMIN_PASSWORD' : 'E2E_AUDIT_USER_PASSWORD'
  // Trim here so a whitespace-only env var throws with an error message
  // that names the env var (matching this function's docstring contract),
  // rather than falling through to loginAndSave whose error names
  // `email`/`password` parameters and is less debuggable from the CLI.
  const email = (process.env[emailVar] ?? '').trim()
  const password = (process.env[passwordVar] ?? '').trim()
  const baseURL =
    process.env['PLAYWRIGHT_AUDIT_BASE_URL'] ??
    'https://staging.concertcrawl.app'
  const outputPath = auditStorageStatePath(role)

  // Guard BEFORE the missing-creds check — if the base URL is prod, the
  // operator needs to fix that regardless of whether creds are set.
  assertNotProdBaseUrl(baseURL)

  if (email === '' || password === '') {
    throw new Error(
      `prepareAuditAuth: ${emailVar} and ${passwordVar} must both be set`,
    )
  }

  await loginAndSave(email, password, outputPath, baseURL)
}
