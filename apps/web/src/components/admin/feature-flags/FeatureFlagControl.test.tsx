// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react'
import type { AdminFeatureFlag } from '@concert-crawl/entitlements'

// ───── Mocks ─────────────────────────────────────────────────────────────────

const patch = vi.fn()
// ApiError is declared inside the factory so vi.mock hoisting can't trip on a
// top-level reference; it carries status/message so `instanceof ApiError`
// narrows correctly inside the control's catch.
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
      patch: (...args: unknown[]) => patch(...args),
    },
    ApiError,
  }
})

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'tok' }),
}))

import { FeatureFlagControl } from './FeatureFlagControl'

const flags: AdminFeatureFlag[] = [
  {
    key: 'crews',
    label: 'Crews',
    description: 'The Crews tab and crew pages.',
    enabled: false,
    updatedAt: null,
    updatedBy: null,
  },
]

const changedFlags: AdminFeatureFlag[] = [
  {
    key: 'crews',
    label: 'Crews',
    description: 'The Crews tab and crew pages.',
    enabled: false,
    updatedAt: '2026-09-07T00:00:00.000Z',
    updatedBy: 'admin',
  },
]

const clickButton = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }))

beforeEach(() => {
  patch.mockReset()
})

afterEach(cleanup)

describe('FeatureFlagControl', () => {
  it('renders a row per flag with its current state', () => {
    render(<FeatureFlagControl initial={flags} />)
    expect(screen.getByText('Crews')).toBeVisible()
    expect(screen.getByText('Off')).toBeVisible()
    expect(screen.getByText('Never changed')).toBeVisible()
  })

  it('labels the timestamp on a flag that has been changed', () => {
    render(<FeatureFlagControl initial={changedFlags} />)
    // The relative time renders as its own node, so the label is asserted on
    // the containing element rather than as a standalone string.
    expect(screen.getByText(/^Changed/)).toBeVisible()
    expect(screen.queryByText('Never changed')).toBeNull()
  })

  it('asks for confirmation before saving', () => {
    render(<FeatureFlagControl initial={flags} />)
    clickButton('Turn on')
    expect(screen.getByText('Turn this on?')).toBeVisible()
    expect(patch).not.toHaveBeenCalled()
  })

  it('saves and reflects the new state on confirm', async () => {
    patch.mockResolvedValue({
      ...flags[0],
      enabled: true,
      updatedAt: '2026-09-07T00:00:00.000Z',
      updatedBy: 'admin',
    })
    render(<FeatureFlagControl initial={flags} />)
    clickButton('Turn on')
    clickButton('Save')
    await waitFor(() => expect(screen.getByText('On')).toBeVisible())
    expect(patch).toHaveBeenCalledWith('/v1/admin/feature-flags/crews', 'tok', {
      enabled: true,
    })
  })

  it('saves nothing on cancel', () => {
    render(<FeatureFlagControl initial={flags} />)
    clickButton('Turn on')
    clickButton('Cancel')
    expect(patch).not.toHaveBeenCalled()
    expect(screen.getByText('Off')).toBeVisible()
  })

  it('surfaces an error and leaves the state unchanged when the save fails', async () => {
    patch.mockRejectedValue(new Error('boom'))
    render(<FeatureFlagControl initial={flags} />)
    clickButton('Turn on')
    clickButton('Save')
    await waitFor(() =>
      expect(screen.getByText(/Could not save the flag/)).toBeVisible(),
    )
    expect(screen.getByText('Off')).toBeVisible()
  })
})
