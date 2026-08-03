// @vitest-environment jsdom

import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

vi.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'electric' }),
}))

const mockTrack = vi.fn()
vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}))

import { ShareButton } from './ShareButton'
import type { PosterSource } from '@/lib/share/poster-event'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const EVENT_ID = '11111111-2222-4333-8444-555555555555'

// `PosterSource` is the poster's own structural input, so this fixture is
// exactly the event the component reads — no cast, no forty irrelevant nulls.
const event: PosterSource = {
  id: EVENT_ID,
  artist: 'Snakebite Revival',
  date: '2026-03-14',
  showTime: '20:00',
  venue: {
    name: 'Bluebird Theater',
    city: 'Denver',
    timezone: 'America/Denver',
  },
  ticketPriceMin: '28.00',
  ticketPriceOpenedAt: null,
  priceStatus: 'live',
}

const mount = (authed = true) =>
  render(<ShareButton event={event} authed={authed} />)

describe('<ShareButton />', () => {
  it('is a labelled 44px trigger that advertises the dialog', () => {
    mount()
    const trigger = screen.getByRole('button', { name: 'Share this show' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.className).toContain('h-11')
    expect(trigger.className).toContain('w-11')
  })

  it('sits opposite the back chip, not on top of it', () => {
    mount()
    const trigger = screen.getByRole('button', { name: 'Share this show' })
    expect(trigger.className).toContain('right-2.5')
    expect(trigger.className).not.toContain('left-2.5')
  })

  it('opens the share sheet and reflects that in aria-expanded', () => {
    mount()
    const trigger = screen.getByRole('button', { name: 'Share this show' })
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  it('records the opened sheet as the head of the share funnel', () => {
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Share this show' }))

    expect(mockTrack).toHaveBeenCalledWith('share_sheet_opened', {
      eventId: EVENT_ID,
      surface: 'event-detail',
      authed: true,
    })
  })

  // `authed` is a required prop precisely because the public mirror and the
  // protected page mount this with otherwise identical props — a share taken
  // from the mirror has to be distinguishable from a signed-in one.
  it('carries the session state through to the event', () => {
    mount(false)

    fireEvent.click(screen.getByRole('button', { name: 'Share this show' }))

    expect(mockTrack).toHaveBeenCalledWith(
      'share_sheet_opened',
      expect.objectContaining({ authed: false }),
    )
  })

  it('does not record an open until the trigger is actually pressed', () => {
    mount()

    expect(mockTrack).not.toHaveBeenCalled()
  })

  it('carries no watch affordance — the hero is Back and Share only', () => {
    mount()
    // Watching is the eye control below the title; there is no heart anywhere
    // in this product and no second show-tracking concept in the hero.
    expect(screen.queryByRole('button', { name: /watch/i })).toBeNull()
  })
})
