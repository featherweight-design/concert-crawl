// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { AdminUsersClient } from './AdminUsersClient'
import type { AdminUserRow } from './AdminUsersClient'

vi.mock('@/lib/actions/admin-users', () => ({
  updateUserRole: vi.fn(),
}))

const baseRow = (overrides: Partial<AdminUserRow> = {}): AdminUserRow => ({
  id: 'user_abc',
  email: 'member@example.com',
  handle: 'memberhandle',
  role: 'beta',
  createdAt: '2026-04-01T00:00:00.000Z',
  ...overrides,
})

afterEach(cleanup)

describe('AdminUsersClient', () => {
  it('links each row to its user detail page (desktop + mobile)', () => {
    render(<AdminUsersClient initialUsers={[baseRow()]} total={1} />)
    const detailLinks = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('href') === '/admin/users/user_abc')
    // one link in the desktop table, one in the mobile card
    expect(detailLinks.length).toBe(2)
    for (const link of detailLinks) {
      expect(within(link).getByText('member@example.com')).toBeTruthy()
    }
  })

  it('prefixes the handle with @ in the link aria-label to match the visible text', () => {
    render(<AdminUsersClient initialUsers={[baseRow()]} total={1} />)
    const links = screen.getAllByRole('link', {
      name: 'View details for @memberhandle',
    })
    expect(links.length).toBe(2)
  })

  it('falls back to the email in the link aria-label when handle is null', () => {
    render(
      <AdminUsersClient initialUsers={[baseRow({ handle: null })]} total={1} />,
    )
    const links = screen.getAllByRole('link', {
      name: 'View details for member@example.com',
    })
    expect(links.length).toBe(2)
  })
})
