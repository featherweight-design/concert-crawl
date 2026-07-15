// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import React from 'react'
import { AdminUsersClient } from './AdminUsersClient'
import type { AdminUserRow } from './AdminUsersClient'

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

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

  it('renders the visible @handle span inside each link when a handle is present', () => {
    render(<AdminUsersClient initialUsers={[baseRow()]} total={1} />)
    const detailLinks = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('href') === '/admin/users/user_abc')
    expect(detailLinks.length).toBe(2)
    // Guards against the visible @handle span being dropped while the
    // aria-label still carries the handle — the accessible-name test alone
    // would not catch that regression.
    for (const link of detailLinks) {
      expect(within(link).getByText('@memberhandle')).toBeTruthy()
    }
  })

  it('renders no @handle span inside the link when handle is null', () => {
    render(
      <AdminUsersClient initialUsers={[baseRow({ handle: null })]} total={1} />,
    )
    const detailLinks = screen
      .getAllByRole('link')
      .filter((el) => el.getAttribute('href') === '/admin/users/user_abc')
    expect(detailLinks.length).toBe(2)
    for (const link of detailLinks) {
      expect(within(link).queryByText(/^@/)).toBeNull()
    }
  })

  it('includes the full visible text (email + @handle) in the link accessible name', () => {
    render(<AdminUsersClient initialUsers={[baseRow()]} total={1} />)
    const links = screen.getAllByRole('link', {
      name: 'View details for member@example.com @memberhandle',
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
