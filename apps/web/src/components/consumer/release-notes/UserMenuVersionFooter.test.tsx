// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RELEASES } from '@/lib/definitions/releases'
import { UserMenuVersionFooter } from './UserMenuVersionFooter'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Hoisted: `vi.mock` runs before module-scope consts, so the spy has to be
// created inside the hoisted block to be visible to the factory.
const { useFeatureFlag } = vi.hoisted(() => ({ useFeatureFlag: vi.fn() }))
vi.mock('@/lib/queries/use-feature-flags', () => ({ useFeatureFlag }))

const mockFeatureFlag = (key: string, enabled: boolean) =>
  useFeatureFlag.mockImplementation((requested: string) => ({
    isLoading: false,
    enabled: requested === key ? enabled : true,
  }))

beforeEach(() => {
  // Flags on by default, so every pre-flag assertion keeps asserting the
  // behaviour it was written for.
  mockFeatureFlag('release-notes', true)
})

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

  it('renders nothing when the release-notes flag is off', () => {
    mockFeatureFlag('release-notes', false)
    const { container } = render(<UserMenuVersionFooter build="v0.5.0-beta" />)
    expect(container.innerHTML).toBe('')
  })

  it('renders the footer as before when the flag is on', () => {
    mockFeatureFlag('release-notes', true)
    render(<UserMenuVersionFooter build="v0.5.0-beta" />)
    expect(screen.getByRole('button')).toBeTruthy()
  })
})
