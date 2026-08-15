// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  act,
} from '@testing-library/react'

import type * as UserExportModule from '@/lib/user-export'

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('tok') }),
}))

const download = vi.fn<(token: string) => Promise<void>>(() =>
  Promise.resolve(),
)

// Only the fetch is mocked. `ExportRateLimitedError` is compared with
// `instanceof`, so a stubbed class would silently route every refusal into the
// failure branch instead — the exact bug this row exists to avoid.
vi.mock('@/lib/user-export', async () => {
  const actual =
    await vi.importActual<typeof UserExportModule>('@/lib/user-export')
  return { ...actual, downloadUserDataExport: (tok: string) => download(tok) }
})

import { DataExportRow } from './DataExportRow'
import { ExportRateLimitedError } from '@/lib/user-export'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const COPY = CONSUMER_COPY.settings.dataExport

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  // Here rather than inline, so a failing assertion cannot leave a stubbed
  // fetch behind for the next test.
  vi.unstubAllGlobals()
  download.mockClear()
  download.mockImplementation(() => Promise.resolve())
})

describe('DataExportRow', () => {
  it('renders at rest, with no plan or entitlement in its way', () => {
    render(<DataExportRow />)
    const row = screen.getByRole('button')
    expect(row).toBeEnabled()
    expect(row).toHaveTextContent(COPY.label)
    expect(row).toHaveTextContent(COPY.restDetail)
    expect(row).toHaveTextContent(COPY.chipRest)
  })

  it('downloads with the caller token and returns to rest', async () => {
    render(<DataExportRow />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(download).toHaveBeenCalledWith('tok'))
    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveTextContent(COPY.restDetail),
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  // The refusal is not a failure. It names the real wait from Retry-After and
  // renders beneath the row, so the row's own copy never becomes an error.
  it('counts down a rate-limit refusal and re-enables at zero', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    download.mockImplementation(() =>
      Promise.reject(new ExportRateLimitedError(90)),
    )

    render(<DataExportRow />)
    // `act` rather than `waitFor`: waitFor drives the fake clock itself, which
    // would eat part of the countdown this test is measuring.
    await act(async () => void fireEvent.click(screen.getByRole('button')))

    expect(screen.getByRole('status')).toHaveTextContent(
      COPY.limited(COPY.waitMinutes(2)),
    )
    expect(screen.getByRole('button')).toBeDisabled()
    // The countdown is not announced on every tick, so the disabled button has
    // to carry the reason itself.
    expect(screen.getByRole('button')).toHaveAccessibleDescription(
      expect.stringContaining(COPY.waitMinutes(2)),
    )

    // Under the minute the wait switches units rather than rounding to "1
    // minute" for the last 59 seconds.
    await act(async () => void vi.advanceTimersByTime(31_000))
    expect(screen.getByRole('status')).toHaveTextContent(
      COPY.limited(COPY.waitSeconds(59)),
    )

    await act(async () => void vi.advanceTimersByTime(60_000))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button')).toBeEnabled()
  })

  it('falls back to the full hour when Retry-After is unusable', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response('{}', { status: 429, headers: { 'Retry-After': 'soon' } }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { downloadUserDataExport } =
      await vi.importActual<typeof UserExportModule>('@/lib/user-export')

    await expect(downloadUserDataExport('tok')).rejects.toMatchObject({
      retryAfterSeconds: 3600,
    })
  })

  it('reports a real failure separately, and stays pressable', async () => {
    download.mockImplementation(() => Promise.reject(new Error('boom')))
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<DataExportRow />)
    fireEvent.click(screen.getByRole('button'))

    // `alert` rather than `status`: a failure interrupts the reader, while the
    // rate-limit countdown is ambient.
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(COPY.failed),
    )
    // A failed export is retryable immediately; only the rate limit disables.
    expect(screen.getByRole('button')).toBeEnabled()
    err.mockRestore()
  })
})
