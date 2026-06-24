// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RELEASES } from '@/lib/definitions/releases'
import { UserMenuVersionFooter } from './UserMenuVersionFooter'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Read-state is driven by the newest release version (RELEASES[0]), not the
// `build` prop. Tests use the live latest so adding new entries to releases.ts
// doesn't break the unread/read assertions.
const latestVersion = RELEASES[0]?.version ?? ''

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
    localStorage.setItem('cc.lastSeenRelease', latestVersion)
    render(<UserMenuVersionFooter build={latestVersion} />)
    expect(screen.getByText('Changelog')).toBeTruthy()
  })

  it("shows What's new when unread", () => {
    // no lastSeen in localStorage → unread
    render(<UserMenuVersionFooter build={latestVersion} />)
    expect(screen.getByText('What’s new')).toBeTruthy()
  })

  it('navigates to /changelog when clicked', () => {
    render(<UserMenuVersionFooter build="v0.5.0-beta" />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockPush).toHaveBeenCalledWith('/changelog')
  })
})
