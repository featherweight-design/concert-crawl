// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { PriceSubmission } from '@concert-crawl/types'

import { DisputeForm } from './DisputeForm'
import {
  CONSUMER_COPY,
  VENDOR_PICKER_COPY,
} from '@/components/consumer/definitions/copy'

const getToken = vi.fn(async () => 'test-token')

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

const submission: PriceSubmission = {
  id: 'sub-1',
  eventId: 'evt-1',
  userId: 'user-1',
  priceMin: '40',
  priceMax: null,
  tier: 'GA',
  vendor: 'AXS',
  howFound: 'bought_myself',
  sourceCategory: 'standard',
  disputedSubmissionId: null,
  status: 'corroborated',
  corroborationCount: 2,
  note: null,
  archivedReason: null,
  lastAdminActionAt: null,
  lastAdminActionKind: null,
  createdAt: '2026-07-27T00:00:00.000Z',
  updatedAt: '2026-07-27T00:00:00.000Z',
}

const renderForm = () =>
  render(<DisputeForm submission={submission} eventId="evt-1" />)

const lastPostBody = (): Record<string, unknown> => {
  const mockFetch = vi.mocked(global.fetch)
  const [, init] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1] ?? []
  return JSON.parse(String(init?.body))
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ success: true }))),
  )
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('DisputeForm fields', () => {
  it('asks for a price only, with no vendor picker', () => {
    renderForm()

    expect(
      screen.queryByRole('radiogroup', { name: VENDOR_PICKER_COPY.label }),
    ).toBeNull()
  })

  it('posts the price without a vendor, which the server inherits', async () => {
    renderForm()

    fireEvent.change(screen.getByLabelText(/floor/i), {
      target: { value: '55' },
    })
    fireEvent.click(
      screen.getByRole('button', {
        name: CONSUMER_COPY.disputeForm.submitButton,
      }),
    )

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(lastPostBody()).toEqual({ floor: 55 })
  })
})

describe('DisputeForm error handling', () => {
  it('shows the generic error when the API answers with a non-JSON body', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('<html>502 Bad Gateway</html>', { status: 502 }),
      ),
    )
    renderForm()

    fireEvent.change(screen.getByLabelText(/floor/i), {
      target: { value: '55' },
    })
    fireEvent.click(
      screen.getByRole('button', {
        name: CONSUMER_COPY.disputeForm.submitButton,
      }),
    )

    expect(
      await screen.findByText(CONSUMER_COPY.disputeForm.genericError),
    ).toBeInTheDocument()
  })
})
