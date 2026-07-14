import { loginAndSave } from '../fixtures/auth.js'

/**
 * Logs in the requested fixture role and writes the Playwright storage state
 * to `.auth/audit-<role>.json`. Throws if the required env vars are not set.
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
  const email = process.env[emailVar] ?? ''
  const password = process.env[passwordVar] ?? ''
  const baseURL =
    process.env['PLAYWRIGHT_AUDIT_BASE_URL'] ??
    'https://staging.concertcrawl.app'
  const outputPath = `.auth/audit-${role}.json`

  if (email === '' || password === '') {
    throw new Error(
      `prepareAuditAuth: ${emailVar} and ${passwordVar} must both be set`,
    )
  }

  await loginAndSave(email, password, outputPath, baseURL)
}
