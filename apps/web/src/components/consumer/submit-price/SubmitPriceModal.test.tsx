// @vitest-environment jsdom

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  vi.clearAllMocks()
})

const mockGetToken = vi.fn().mockResolvedValue('test-token')
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/components/brand/cc-mark', () => ({
  CCMark: () => <div data-testid="cc-mark" />,
}))
vi.mock('lucide-react', () => ({
  ShieldCheck: () => <svg data-testid="shield-check-icon" />,
}))
vi.mock('@/lib/sp-policy', () => ({
  validateSubmission: () => ({ valid: true, errors: {}, warnings: {} }),
}))

// Default: no existing submission
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    success: true,
    data: { alreadySubmitted: false, userSubmission: null },
  }),
})

import { SubmitPriceModal } from './SubmitPriceModal'

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  eventId: 'evt-1',
  artist: 'Radiohead',
  venueName: 'Red Rocks',
  date: '2099-07-15T19:00:00.000Z',
}

describe('SubmitPriceModal — form view', () => {
  it('renders nothing when closed', () => {
    render(<SubmitPriceModal {...defaultProps} open={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the form after checking for existing submission', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    expect(screen.getByText('Radiohead')).toBeTruthy()
    expect(screen.getByText(/Red Rocks/)).toBeTruthy()
  })

  it('renders the ShieldCheck icon in the anti-abuse banner', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() =>
      expect(screen.getByTestId('shield-check-icon')).toBeTruthy(),
    )
  })

  it('renders tier chip options', async () => {
    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('GA')).toBeTruthy())
    expect(screen.getByText('VIP')).toBeTruthy()
  })
})

describe('SubmitPriceModal — success state', () => {
  it('shows success view after successful submission', async () => {
    // First call: check existing (none). Second call: submit (success).
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { alreadySubmitted: false, userSubmission: null },
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      })
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())

    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() => expect(screen.getByText('Got it.')).toBeTruthy())
    expect(screen.getByText('Back to show')).toBeTruthy()
    expect(screen.queryByText('Submit another')).toBeNull()
  })
})

describe('SubmitPriceModal — error state (#398)', () => {
  it('shows full error view (not inline text) when submission fails', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { alreadySubmitted: false, userSubmission: null },
          }),
        })
      }
      return Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())

    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() =>
      expect(screen.getByText("Didn't go through.")).toBeTruthy(),
    )
    expect(screen.getByText('Try again')).toBeTruthy()
    expect(screen.getByText('Close')).toBeTruthy()
    // Must NOT use the old inline error text pattern
    expect(screen.queryByText('Something went wrong.')).toBeNull()
  })

  it('returns to form with "Try again"', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { alreadySubmitted: false, userSubmission: null },
          }),
        })
      }
      return Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() =>
      expect(screen.getByText("Didn't go through.")).toBeTruthy(),
    )
    fireEvent.click(screen.getByText('Try again'))
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
  })
})

describe('SubmitPriceModal — alreadySubmitted state', () => {
  it('starts in alreadySubmitted when existing submission is found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          alreadySubmitted: true,
          userSubmission: {
            id: 'sub-1',
            priceMin: 45,
            priceMax: 75,
            tier: 'GA',
            vendor: 'AXS',
          },
        },
      }),
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Already in.')).toBeTruthy())
    expect(screen.getByText(/\$45/)).toBeTruthy()
    expect(screen.getByText('Edit submission')).toBeTruthy()
    expect(screen.getByText('Withdraw')).toBeTruthy()
  })

  it('transitions to alreadySubmitted on 409 from POST', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { alreadySubmitted: false, userSubmission: null },
          }),
        })
      }
      return Promise.resolve({
        ok: false,
        status: 409,
        json: async () => ({}),
      })
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())
    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() => expect(screen.getByText('Already in.')).toBeTruthy())
  })

  it('sets existingSubmission from 409 body and Withdraw succeeds → modal closes', async () => {
    const onClose = vi.fn()
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Initial check: no existing submission
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { alreadySubmitted: false, userSubmission: null },
          }),
        })
      }
      if (callCount === 2) {
        // POST returns 409 with submission data
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({
            submission: {
              id: 'sub-409',
              priceMin: '55',
              priceMax: null,
              tier: 'GA',
              vendor: 'AXS',
            },
          }),
        })
      }
      // DELETE succeeds
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      })
    })

    render(<SubmitPriceModal {...defaultProps} onClose={onClose} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())

    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() => expect(screen.getByText('Already in.')).toBeTruthy())
    expect(screen.getByText(/\$55/)).toBeTruthy()

    fireEvent.click(screen.getByText('Withdraw'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('shows error state when Withdraw fails', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Initial check: no existing submission
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { alreadySubmitted: false, userSubmission: null },
          }),
        })
      }
      if (callCount === 2) {
        // POST returns 409 with submission data
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({
            submission: {
              id: 'sub-409',
              priceMin: '55',
              priceMax: null,
              tier: 'GA',
              vendor: 'AXS',
            },
          }),
        })
      }
      // DELETE fails
      return Promise.resolve({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' }),
      })
    })

    render(<SubmitPriceModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Floor')).toBeTruthy())

    fireEvent.click(screen.getByText('Submit price'))
    await waitFor(() => expect(screen.getByText('Already in.')).toBeTruthy())

    fireEvent.click(screen.getByText('Withdraw'))
    await waitFor(() =>
      expect(screen.getByText("Didn't go through.")).toBeTruthy(),
    )
    expect(screen.getByText('Try again')).toBeTruthy()
    // Should show a non-network-specific error for a 403
    expect(screen.queryByText(/Couldn't reach the server/)).toBeNull()
  })
})
