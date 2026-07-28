// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'

import { CounterSubmitSheet } from './CounterSubmitSheet'
import { VENDOR_PICKER_COPY } from '@/components/consumer/definitions/copy'

const getToken = vi.fn(async () => 'test-token')
const refresh = vi.fn()

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

const renderSheet = () =>
  render(
    <CounterSubmitSheet
      open
      onClose={vi.fn()}
      eventId="evt-1"
      disputedSubmissionId="sub-1"
      currentFloor={40}
      currentVendor="AXS"
    />,
  )

// The sheet only POSTs once every field validates, so every submission test
// has to fill the whole form.
const fillRequiredFields = () => {
  fireEvent.change(screen.getByLabelText(/floor/i), { target: { value: '55' } })
  fireEvent.click(screen.getByRole('button', { name: 'GA' }))
  fireEvent.click(screen.getByRole('button', { name: /bought it myself/i }))
}

const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: /submit|update/i }))

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
  vi.clearAllMocks()
})

describe('CounterSubmitSheet vendor picker', () => {
  it('renders the shared grouped picker, not a flat vendor chip list', () => {
    renderSheet()

    const group = screen.getByRole('radiogroup', {
      name: VENDOR_PICKER_COPY.label,
    })
    expect(within(group).getAllByRole('radio')).toHaveLength(3)
    expect(
      screen.getByRole('button', { name: VENDOR_PICKER_COPY.moreTriggerLabel }),
    ).toBeInTheDocument()
  })

  it('offers Etix, the vendor the flat six-option list was missing', () => {
    renderSheet()

    fireEvent.click(
      screen.getByRole('button', { name: VENDOR_PICKER_COPY.moreTriggerLabel }),
    )

    expect(screen.getByRole('option', { name: 'Etix' })).toBeInTheDocument()
  })

  it('teaches the resale distinction the flat list never did', () => {
    renderSheet()

    fireEvent.click(
      screen.getByRole('button', { name: VENDOR_PICKER_COPY.moreTriggerLabel }),
    )

    expect(
      screen.getByRole('group', {
        name: `${VENDOR_PICKER_COPY.groups.resale.label}, ${VENDOR_PICKER_COPY.groups.resale.caption}`,
      }),
    ).toBeInTheDocument()
  })

  it('posts a vendor picked from the dropdown', async () => {
    renderSheet()

    fillRequiredFields()
    fireEvent.click(
      screen.getByRole('button', { name: VENDOR_PICKER_COPY.moreTriggerLabel }),
    )
    fireEvent.click(screen.getByRole('option', { name: 'Etix' }))
    submit()

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(lastPostBody()['vendor']).toBe('Etix')
  })

  it('posts the catch-all as Other rather than silently becoming Ticketmaster', async () => {
    renderSheet()

    fillRequiredFields()
    fireEvent.click(
      screen.getByRole('button', { name: VENDOR_PICKER_COPY.moreTriggerLabel }),
    )
    fireEvent.click(
      screen.getByRole('option', { name: VENDOR_PICKER_COPY.vendors.Other }),
    )
    submit()

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(lastPostBody()['vendor']).toBe('Other')
  })

  it('blocks submission until a vendor is picked', () => {
    renderSheet()

    fillRequiredFields()
    submit()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.getByText("Pick where it's listed.")).toBeInTheDocument()
  })
})
