// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UserMenuVersionFooter } from './UserMenuVersionFooter'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('UserMenuVersionFooter', () => {
  it('renders the build label', () => {
    render(<UserMenuVersionFooter build="v0.5.0-beta" />)
    expect(screen.getByText('v0.5.0-beta')).toBeTruthy()
  })

  it('shows Changelog text when not unread', () => {
    localStorage.setItem('cc.lastSeenRelease', 'v0.5.0-beta')
    render(<UserMenuVersionFooter build="v0.5.0-beta" />)
    expect(screen.getByText('Changelog')).toBeTruthy()
  })

  it("shows What's new when unread", () => {
    // no lastSeen in localStorage → unread
    render(<UserMenuVersionFooter build="v0.5.0-beta" />)
    expect(screen.getByText('What’s new')).toBeTruthy()
  })

  it('navigates to /changelog when clicked', () => {
    render(<UserMenuVersionFooter build="v0.5.0-beta" />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockPush).toHaveBeenCalledWith('/changelog')
  })
})
