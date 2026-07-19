// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from '@testing-library/react'

const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

const getCachedEventsMock = vi.fn()
const getCachedVenuesMock = vi.fn()
vi.mock('@/lib/pwa/cached-content', () => ({
  getCachedEvents: () => getCachedEventsMock(),
  getCachedVenues: () => getCachedVenuesMock(),
}))

import { OfflineFallback } from '../OfflineFallback'

afterEach(() => {
  cleanup()
  refreshMock.mockReset()
  getCachedEventsMock.mockReset()
  getCachedVenuesMock.mockReset()
})

describe('OfflineFallback', () => {
  it('renders the eyebrow + title + retry immediately', () => {
    getCachedEventsMock.mockResolvedValue([])
    getCachedVenuesMock.mockResolvedValue([])
    render(<OfflineFallback />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(
      /offline/i,
    )
    expect(screen.getByRole('button', { name: /try again/i })).not.toBeNull()
  })

  it('renders the CachedEmpty state when no cached content', async () => {
    getCachedEventsMock.mockResolvedValue([])
    getCachedVenuesMock.mockResolvedValue([])
    render(<OfflineFallback />)
    await waitFor(() => {
      expect(screen.getByText(/nothing cached yet/i)).not.toBeNull()
    })
  })

  it('renders CachedShortcuts when cached events are present', async () => {
    getCachedEventsMock.mockResolvedValue([
      {
        id: 'evt-1',
        title: 'Amyl at the Roxy',
        date: '2026-08-14',
        venue: { name: 'The Roxy', slug: 'the-roxy' },
      },
    ])
    getCachedVenuesMock.mockResolvedValue([])
    render(<OfflineFallback />)
    await waitFor(() => {
      expect(screen.getByText(/amyl at the roxy/i)).not.toBeNull()
    })
  })

  it('calls router.refresh on retry', () => {
    getCachedEventsMock.mockResolvedValue([])
    getCachedVenuesMock.mockResolvedValue([])
    render(<OfflineFallback />)
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })
})
