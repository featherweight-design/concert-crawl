// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react'
import type { AdminFounderWindow } from '@concert-crawl/types'

// ───── Mocks ─────────────────────────────────────────────────────────────────

const mockGetToken = vi.fn().mockResolvedValue('test-token')
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

const mockApiPost = vi.fn()
// ApiError kept inside the factory so vi.mock hoisting can't trip on
// top-level access; carries status/message/code so `instanceof ApiError`
// narrows correctly inside runAction's catch.
vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    constructor(
      public readonly status: number,
      message: string,
      public readonly code?: string,
    ) {
      super(message)
      this.name = 'ApiError'
    }
  }
  return {
    apiClient: {
      post: (...args: unknown[]) => mockApiPost(...args),
    },
    ApiError,
  }
})

import { ApiError as MockApiError } from '@/lib/api'
import { FounderWindowControl } from './FounderWindowControl'

const buttonByName = (name: string): HTMLButtonElement => {
  const btn = screen.getByRole('button', { name })
  if (!(btn instanceof HTMLButtonElement)) {
    throw new Error(`Expected "${name}" to be an HTMLButtonElement`)
  }
  return btn
}

const baseWindow = (
  overrides: Partial<AdminFounderWindow> = {},
): AdminFounderWindow => ({
  state: 'pre-launch',
  opensAt: null,
  closesAt: null,
  windowDays: 14,
  seatsTotal: 100,
  seatsRemaining: 100,
  seatsRemainingTest: 5,
  recentClaims: [],
  ...overrides,
})

beforeEach(() => {
  mockGetToken.mockClear().mockResolvedValue('test-token')
  mockApiPost.mockReset()
})
afterEach(cleanup)

describe('FounderWindowControl — launch button gating', () => {
  it('renders the open button in pre-launch', () => {
    render(<FounderWindowControl initial={baseWindow()} />)
    expect(
      screen.getByRole('button', { name: 'Open the founder window' }),
    ).toBeTruthy()
  })

  it('hides the open button once the window is open', () => {
    render(
      <FounderWindowControl
        initial={baseWindow({
          state: 'open',
          opensAt: '2026-07-12T00:00:00.000Z',
          closesAt: '2026-07-26T00:00:00.000Z',
        })}
      />,
    )
    expect(
      screen.queryByRole('button', { name: 'Open the founder window' }),
    ).toBeNull()
  })

  it('hides the open button once the window is closed', () => {
    render(
      <FounderWindowControl
        initial={baseWindow({
          state: 'closed',
          opensAt: '2026-06-01T00:00:00.000Z',
          closesAt: '2026-06-15T00:00:00.000Z',
        })}
      />,
    )
    expect(
      screen.queryByRole('button', { name: 'Open the founder window' }),
    ).toBeNull()
  })
})

describe('FounderWindowControl — confirmation modal gating', () => {
  it('opens the confirm dialog before launching, not a direct call', () => {
    render(<FounderWindowControl initial={baseWindow()} />)
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(buttonByName('Open the founder window'))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Open the founder window?' }),
    ).toBeTruthy()
    // Clicking the launch button alone must not fire the API — only the
    // modal's confirm action does.
    expect(mockApiPost).not.toHaveBeenCalled()
  })

  it('confirming the dialog posts to the open endpoint', async () => {
    mockApiPost.mockResolvedValue(
      baseWindow({ state: 'open', opensAt: '2026-07-12T00:00:00.000Z' }),
    )
    render(<FounderWindowControl initial={baseWindow()} />)

    fireEvent.click(buttonByName('Open the founder window'))
    fireEvent.click(buttonByName('Open the window'))

    await waitFor(() =>
      expect(mockApiPost).toHaveBeenCalledWith(
        '/v1/admin/founder-window/open',
        'test-token',
        {},
      ),
    )
  })

  it('closes the modal and surfaces the error when open fails', async () => {
    mockApiPost.mockRejectedValue(
      new MockApiError(409, 'The founder window has already been opened'),
    )
    render(<FounderWindowControl initial={baseWindow()} />)

    fireEvent.click(buttonByName('Open the founder window'))
    fireEvent.click(buttonByName('Open the window'))

    // Modal closes on failure so the error is visible, not hidden behind it.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(
      screen.getByText('The founder window has already been opened'),
    ).toBeTruthy()
  })
})

describe('FounderWindowControl — rehearsal actions', () => {
  it('disables both rehearsal buttons while an action is pending', async () => {
    let resolvePost: (value: { seatsRemainingTest: number }) => void = () => {}
    mockApiPost.mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve
      }),
    )
    render(<FounderWindowControl initial={baseWindow()} />)

    fireEvent.click(buttonByName('Simulate a claim'))

    await waitFor(() =>
      expect(buttonByName('Reset test seats').disabled).toBe(true),
    )
    resolvePost({ seatsRemainingTest: 4 })
  })

  it('renders a failed rehearsal error under the rehearsal panel', async () => {
    mockApiPost.mockRejectedValue(
      new MockApiError(409, 'No test seats remaining'),
    )
    render(<FounderWindowControl initial={baseWindow()} />)

    fireEvent.click(buttonByName('Simulate a claim'))

    await waitFor(() =>
      expect(screen.getByText('No test seats remaining')).toBeTruthy(),
    )
    // The launch help copy still renders; the error is scoped to rehearsal,
    // proving it is not surfaced under the launch control.
    expect(mockApiPost).toHaveBeenCalledWith(
      '/v1/admin/founder-window/simulate-claim',
      'test-token',
      {},
    )
  })
})
