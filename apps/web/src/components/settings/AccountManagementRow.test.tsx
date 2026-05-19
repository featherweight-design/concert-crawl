// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AccountManagementRow } from './AccountManagementRow'

const mockUseClerk = vi.fn(() => ({ openUserProfile: vi.fn() }))
const mockUseUser = vi.fn()

vi.mock('@clerk/nextjs', () => ({
  useClerk: () => mockUseClerk(),
  useUser: () => mockUseUser(),
}))

describe('AccountManagementRow', () => {
  it('shows email row', () => {
    mockUseUser.mockReturnValue({
      user: { passwordEnabled: false, externalAccounts: [] },
    })
    render(<AccountManagementRow email="test@example.com" />)
    expect(screen.getByText('test@example.com')).toBeTruthy()
  })

  it('shows no connected accounts section when externalAccounts is empty', () => {
    mockUseUser.mockReturnValue({
      user: { passwordEnabled: false, externalAccounts: [] },
    })
    render(<AccountManagementRow email="test@example.com" />)
    expect(screen.queryByText('Connected Account')).toBeNull()
  })

  it('shows connected account row for oauth_google', () => {
    mockUseUser.mockReturnValue({
      user: {
        passwordEnabled: false,
        externalAccounts: [{ provider: 'oauth_google' }],
      },
    })
    render(<AccountManagementRow email="test@example.com" />)
    expect(screen.getByText('Connected Account')).toBeTruthy()
    expect(screen.getByText('Google')).toBeTruthy()
  })

  it('shows connected account row for oauth_spotify', () => {
    mockUseUser.mockReturnValue({
      user: {
        passwordEnabled: false,
        externalAccounts: [{ provider: 'oauth_spotify' }],
      },
    })
    render(<AccountManagementRow email="test@example.com" />)
    expect(screen.getByText('Spotify')).toBeTruthy()
  })

  it('shows multiple connected accounts', () => {
    mockUseUser.mockReturnValue({
      user: {
        passwordEnabled: false,
        externalAccounts: [
          { provider: 'oauth_google' },
          { provider: 'oauth_spotify' },
        ],
      },
    })
    render(<AccountManagementRow email="test@example.com" />)
    expect(screen.getByText('Google')).toBeTruthy()
    expect(screen.getByText('Spotify')).toBeTruthy()
  })

  it('renders Clerk privacy footnote link', () => {
    mockUseUser.mockReturnValue({
      user: { passwordEnabled: false, externalAccounts: [] },
    })
    render(<AccountManagementRow email="test@example.com" />)
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeTruthy()
  })

  it('still shows password row when passwordEnabled is true', () => {
    mockUseUser.mockReturnValue({
      user: { passwordEnabled: true, externalAccounts: [] },
    })
    render(<AccountManagementRow email="test@example.com" />)
    expect(screen.getByText(/password/i)).toBeTruthy()
  })
})
