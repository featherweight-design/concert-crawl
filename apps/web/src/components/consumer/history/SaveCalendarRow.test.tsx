// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react'
import type { EntitlementResult } from '@/lib/queries/use-entitlement'

const entitlement: { current: EntitlementResult } = {
  current: { isLoading: false, active: true, surface: 'visible-active' },
}

vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => entitlement.current,
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('tok') }),
}))

const download = vi.fn<(token: string) => Promise<void>>(() =>
  Promise.resolve(),
)
vi.mock('@/lib/history', () => ({
  downloadHistoryIcs: (token: string) => download(token),
}))

import { SaveCalendarRow } from './SaveCalendarRow'
import { HISTORY_COPY } from './definitions/copy'

const COPY = HISTORY_COPY.calendar

afterEach(() => {
  cleanup()
  download.mockClear()
  download.mockImplementation(() => Promise.resolve())
  entitlement.current = {
    isLoading: false,
    active: true,
    surface: 'visible-active',
  }
})

describe('SaveCalendarRow', () => {
  it('renders nothing while the entitlement is resolving', () => {
    entitlement.current = { isLoading: true, active: false, surface: null }
    const { container } = render(<SaveCalendarRow count={3} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when calendar export is locked', () => {
    entitlement.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    }
    const { container } = render(<SaveCalendarRow count={3} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the night count and .ics badge when entitled', () => {
    render(<SaveCalendarRow count={3} />)

    expect(screen.getByText(COPY.label)).toBeInTheDocument()
    expect(screen.getByText(COPY.detail(3))).toBeInTheDocument()
    expect(screen.getByText(COPY.badge)).toBeInTheDocument()
  })

  it('is disabled with an explanatory line at zero nights', () => {
    render(<SaveCalendarRow count={0} />)

    expect(
      screen.getByRole('button', { name: new RegExp(COPY.label) }),
    ).toBeDisabled()
    expect(screen.getByText(COPY.detailEmpty)).toBeInTheDocument()
  })

  it('downloads the .ics on click', async () => {
    render(<SaveCalendarRow count={3} />)

    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.label) }),
    )

    await waitFor(() => expect(download).toHaveBeenCalledWith('tok'))
  })

  it('surfaces a failure in the row rather than throwing', async () => {
    download.mockImplementation(() => Promise.reject(new Error('boom')))
    render(<SaveCalendarRow count={3} />)

    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.label) }),
    )

    expect(await screen.findByText(COPY.failed)).toBeInTheDocument()
  })

  it('names itself from visible text rather than a native title tooltip', () => {
    render(<SaveCalendarRow count={3} />)

    const row = screen.getByRole('button', { name: new RegExp(COPY.label) })
    expect(row).not.toHaveAttribute('title')
  })
})
