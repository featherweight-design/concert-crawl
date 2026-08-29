// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { STALE_AFTER_MS } from '@concert-crawl/types'

let isSignedIn = true
let isLoaded = true

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: vi.fn(async () => 'test-token'),
    isLoaded,
    isSignedIn,
  }),
}))

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: ({ entry }: { entry: string }) => (
    <div data-testid="tier-picker" data-entry={entry} />
  ),
}))

import { StillAccurateAction } from './StillAccurateAction'

const copy = CONSUMER_COPY.priceStaleness

const agoMs = (ms: number): string => new Date(Date.now() - ms).toISOString()
const STALE = (): string => agoMs(STALE_AFTER_MS + 60 * 60 * 1000)
const FRESH = (): string => agoMs(STALE_AFTER_MS - 60 * 60 * 1000)

const renderAction = (
  overrides: Partial<{
    submissionId: string | null
    observedAt: string | null
    onSighted: () => void
  }> = {},
) =>
  render(
    <StillAccurateAction
      eventId="evt-1"
      submissionId="sub-1"
      observedAt={STALE()}
      {...overrides}
    />,
  )

const mockFetch = vi.fn()

beforeEach(() => {
  isSignedIn = true
  isLoaded = true
  mockRefresh.mockReset()
  mockFetch.mockReset()
  mockFetch.mockResolvedValue({ ok: true, status: 200 })
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  // Restores the console.error spy even when an assertion throws first, which
  // an inline mockRestore at the end of the test would skip.
  vi.restoreAllMocks()
})

describe('StillAccurateAction', () => {
  it('offers the action on a stale price', () => {
    renderAction()
    expect(screen.getByTestId('still-accurate-action')).toHaveTextContent(
      copy.stillAccurateAction,
    )
  })

  it('stays hidden while the price is still fresh', () => {
    renderAction({ observedAt: FRESH() })
    expect(screen.queryByTestId('still-accurate-action')).toBeNull()
  })

  // A crawler price has no submission row to stamp, so the missing id is what
  // excludes it — not a check on the price source.
  it('stays hidden when there is no submission behind the price', () => {
    renderAction({ submissionId: null })
    expect(screen.queryByTestId('still-accurate-action')).toBeNull()
  })

  it('stays hidden for a signed-out reader', () => {
    isSignedIn = false
    renderAction()
    expect(screen.queryByTestId('still-accurate-action')).toBeNull()
  })

  // Rendering before Clerk resolves shows the action to anonymous readers, who
  // then get a 401 on click. This codebase has shipped that bug before.
  it('stays hidden until Clerk has resolved', () => {
    isLoaded = false
    renderAction()
    expect(screen.queryByTestId('still-accurate-action')).toBeNull()
  })

  it('posts the sighting and hands the page back to the server', async () => {
    const onSighted = vi.fn()
    renderAction({ onSighted })
    fireEvent.click(screen.getByTestId('still-accurate-action'))

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        '/v1/events/evt-1/price-submissions/sub-1/still-accurate',
      ),
      expect.objectContaining({ method: 'POST' }),
    )
    expect(onSighted).toHaveBeenCalledTimes(1)
  })

  // 409 means someone else already stamped it inside the cooldown. The row is
  // fresh either way, so the reader's view advances exactly as on a 200.
  it('treats a lost race as a sighting', async () => {
    const onSighted = vi.fn()
    mockFetch.mockResolvedValue({ ok: false, status: 409 })
    renderAction({ onSighted })
    fireEvent.click(screen.getByTestId('still-accurate-action'))

    await waitFor(() => expect(onSighted).toHaveBeenCalledTimes(1))
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('opens the sign-in gate on a 401 instead of refreshing', async () => {
    const onSighted = vi.fn()
    mockFetch.mockResolvedValue({ ok: false, status: 401 })
    renderAction({ onSighted })
    fireEvent.click(screen.getByTestId('still-accurate-action'))

    await waitFor(() => expect(screen.getByTestId('tier-picker')).toBeTruthy())
    expect(onSighted).not.toHaveBeenCalled()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('refreshes rather than freezing the view when the request fails', async () => {
    const onSighted = vi.fn()
    mockFetch.mockRejectedValue(new Error('offline'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderAction({ onSighted })
    fireEvent.click(screen.getByTestId('still-accurate-action'))

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    expect(onSighted).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()
  })
})
