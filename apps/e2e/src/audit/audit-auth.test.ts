import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the loginAndSave helper so prepareAuditAuth can be tested without
// triggering a real Playwright browser launch. Only that export is replaced —
// `auditStorageStatePath` is the real one, so the expected paths below are
// asserting against the module that actually owns them.
vi.mock('../fixtures/auth.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../fixtures/auth.js')>()),
  loginAndSave: vi.fn(),
}))

import { loginAndSave } from '../fixtures/auth.js'
import { prepareAuditAuth } from './audit-auth.js'

const mockLoginAndSave = vi.mocked(loginAndSave)

describe('prepareAuditAuth', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    // Clear audit env vars before each test so tests are independent.
    delete process.env['E2E_AUDIT_USER_EMAIL']
    delete process.env['E2E_AUDIT_USER_PASSWORD']
    delete process.env['E2E_AUDIT_ADMIN_EMAIL']
    delete process.env['E2E_AUDIT_ADMIN_PASSWORD']
  })

  afterEach(() => {
    // Restore env to original state.
    for (const key of [
      'E2E_AUDIT_USER_EMAIL',
      'E2E_AUDIT_USER_PASSWORD',
      'E2E_AUDIT_ADMIN_EMAIL',
      'E2E_AUDIT_ADMIN_PASSWORD',
    ]) {
      if (originalEnv[key] !== undefined) {
        process.env[key] = originalEnv[key]
      } else {
        delete process.env[key]
      }
    }
  })

  it('throws when user email env var is not set', async () => {
    process.env['E2E_AUDIT_USER_PASSWORD'] = 'pw'
    await expect(prepareAuditAuth('user')).rejects.toThrow(
      'E2E_AUDIT_USER_EMAIL and E2E_AUDIT_USER_PASSWORD must both be set',
    )
  })

  it('throws when user password env var is not set', async () => {
    process.env['E2E_AUDIT_USER_EMAIL'] = 'user@test.com'
    await expect(prepareAuditAuth('user')).rejects.toThrow(
      'E2E_AUDIT_USER_EMAIL and E2E_AUDIT_USER_PASSWORD must both be set',
    )
  })

  it('throws when admin email env var is not set', async () => {
    process.env['E2E_AUDIT_ADMIN_PASSWORD'] = 'pw'
    await expect(prepareAuditAuth('admin')).rejects.toThrow(
      'E2E_AUDIT_ADMIN_EMAIL and E2E_AUDIT_ADMIN_PASSWORD must both be set',
    )
  })

  it('throws when admin password env var is not set', async () => {
    process.env['E2E_AUDIT_ADMIN_EMAIL'] = 'admin@test.com'
    await expect(prepareAuditAuth('admin')).rejects.toThrow(
      'E2E_AUDIT_ADMIN_EMAIL and E2E_AUDIT_ADMIN_PASSWORD must both be set',
    )
  })

  it('calls loginAndSave with correct args for user role', async () => {
    mockLoginAndSave.mockResolvedValue(undefined)
    process.env['E2E_AUDIT_USER_EMAIL'] = 'user@test.com'
    process.env['E2E_AUDIT_USER_PASSWORD'] = 'userpass'

    await prepareAuditAuth('user')

    expect(mockLoginAndSave).toHaveBeenCalledWith(
      'user@test.com',
      'userpass',
      '.auth/audit-user.json',
      'https://staging.concertcrawl.app',
    )
  })

  it('calls loginAndSave with correct args for admin role', async () => {
    mockLoginAndSave.mockResolvedValue(undefined)
    process.env['E2E_AUDIT_ADMIN_EMAIL'] = 'admin@test.com'
    process.env['E2E_AUDIT_ADMIN_PASSWORD'] = 'adminpass'

    await prepareAuditAuth('admin')

    expect(mockLoginAndSave).toHaveBeenCalledWith(
      'admin@test.com',
      'adminpass',
      '.auth/audit-admin.json',
      'https://staging.concertcrawl.app',
    )
  })

  it('uses PLAYWRIGHT_AUDIT_BASE_URL override when set', async () => {
    mockLoginAndSave.mockResolvedValue(undefined)
    process.env['E2E_AUDIT_USER_EMAIL'] = 'user@test.com'
    process.env['E2E_AUDIT_USER_PASSWORD'] = 'userpass'
    process.env['PLAYWRIGHT_AUDIT_BASE_URL'] = 'http://localhost:3000'

    await prepareAuditAuth('user')

    expect(mockLoginAndSave).toHaveBeenCalledWith(
      'user@test.com',
      'userpass',
      '.auth/audit-user.json',
      'http://localhost:3000',
    )

    delete process.env['PLAYWRIGHT_AUDIT_BASE_URL']
  })
})
