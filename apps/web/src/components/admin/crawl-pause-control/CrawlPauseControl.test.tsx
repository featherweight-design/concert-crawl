// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react'

const mockPauseCrawling = vi.fn()
const mockResumeCrawling = vi.fn()
vi.mock('@/lib/actions/venues', () => ({
  pauseCrawling: (...args: unknown[]) => mockPauseCrawling(...args),
  resumeCrawling: (...args: unknown[]) => mockResumeCrawling(...args),
}))

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

import { CrawlPauseControl } from './CrawlPauseControl'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const COPY = ADMIN_COPY.venueDetailsClient.dangerZone.crawlPause

describe('CrawlPauseControl', () => {
  beforeEach(() => {
    mockPauseCrawling.mockResolvedValue(undefined)
    mockResumeCrawling.mockResolvedValue(undefined)
  })
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('will not pause without a reason', () => {
    render(<CrawlPauseControl venueId="venue-1" crawlPausedAt={null} />)
    const button = screen.getByRole('button', { name: COPY.pauseButton })
    expect(button.hasAttribute('disabled')).toBe(true)

    fireEvent.change(screen.getByLabelText(COPY.reasonLabel), {
      target: { value: '   ' },
    })
    expect(button.hasAttribute('disabled')).toBe(true)
  })

  it('pauses with the trimmed reason', async () => {
    render(<CrawlPauseControl venueId="venue-1" crawlPausedAt={null} />)
    fireEvent.change(screen.getByLabelText(COPY.reasonLabel), {
      target: { value: '  venue asked us to stop  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.pauseButton }))

    await waitFor(() =>
      expect(mockPauseCrawling).toHaveBeenCalledWith(
        'venue-1',
        'venue asked us to stop',
      ),
    )
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
  })

  it('shows when a paused venue was paused, and resumes it', async () => {
    render(
      <CrawlPauseControl
        venueId="venue-1"
        crawlPausedAt="2026-10-28T15:00:00.000Z"
      />,
    )
    expect(screen.getByText(/Paused since/)).toBeTruthy()
    expect(screen.queryByLabelText(COPY.reasonLabel)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: COPY.resumeButton }))
    await waitFor(() =>
      expect(mockResumeCrawling).toHaveBeenCalledWith('venue-1'),
    )
    expect(mockPauseCrawling).not.toHaveBeenCalled()
  })
})
