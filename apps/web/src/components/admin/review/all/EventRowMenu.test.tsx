// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { EventRowMenu, type EventRowActions } from './EventRowMenu'
import { type AllEvent } from './types'

const baseEvent = (overrides: Partial<AllEvent> = {}): AllEvent => ({
  id: 'evt-1',
  title: 'Lord Huron',
  artist: 'Lord Huron',
  venueId: 'venue-1',
  venueName: 'Mission Ballroom',
  date: '2026-07-12',
  doorsTime: null,
  showTime: '20:00',
  ticketPriceMin: '35',
  ticketPriceMax: null,
  confidenceScore: 0.82,
  verified: false,
  status: 'upcoming',
  extractionStrategy: 'json-ld',
  sourceUrl: null,
  genre: ['indie'],
  createdAt: '2026-06-12T18:14:00Z',
  isSoldOut: false,
  ...overrides,
})

const emptyActions = (): EventRowActions => ({
  onViewDetail: vi.fn(),
  onEdit: vi.fn(),
  onVerify: vi.fn(),
  onSendBackToReview: vi.fn(),
  onMarkPostponed: vi.fn(),
  onMarkCancelled: vi.fn(),
  onMarkUpcoming: vi.fn(),
  onMarkSoldOut: vi.fn(),
  onMarkAvailable: vi.fn(),
  onRequestMarkNonConcert: vi.fn(),
  onRequestDelete: vi.fn(),
})

const openMenu = () => {
  fireEvent.click(screen.getByLabelText('Row actions'))
}

describe('EventRowMenu', () => {
  it('opens the menu on trigger click and shows Verify for unverified events', () => {
    render(
      <EventRowMenu
        event={baseEvent({ verified: false })}
        actions={emptyActions()}
      />,
    )
    openMenu()
    expect(screen.getByRole('menuitem', { name: 'Verify' })).toBeTruthy()
    expect(
      screen.queryByRole('menuitem', { name: 'Send back to review' }),
    ).toBeNull()
  })

  it('swaps Verify for Send back to review when the event is verified', () => {
    render(
      <EventRowMenu
        event={baseEvent({ verified: true })}
        actions={emptyActions()}
      />,
    )
    openMenu()
    expect(
      screen.getByRole('menuitem', { name: 'Send back to review' }),
    ).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: 'Verify' })).toBeNull()
  })

  it('shows Mark sold out when the event is available', () => {
    render(
      <EventRowMenu
        event={baseEvent({ isSoldOut: false })}
        actions={emptyActions()}
      />,
    )
    openMenu()
    expect(screen.getByRole('menuitem', { name: 'Mark sold out' })).toBeTruthy()
  })

  it('swaps to Mark available when the event is sold out', () => {
    cleanup()
    render(
      <EventRowMenu
        event={baseEvent({ isSoldOut: true })}
        actions={emptyActions()}
      />,
    )
    openMenu()
    expect(
      screen.getByRole('menuitem', { name: 'Mark available' }),
    ).toBeTruthy()
  })

  it('hides Mark upcoming when the event is already upcoming', () => {
    render(<EventRowMenu event={baseEvent()} actions={emptyActions()} />)
    openMenu()
    expect(screen.queryByRole('menuitem', { name: 'Mark upcoming' })).toBeNull()
  })

  it('invokes onRequestDelete when Delete is clicked', () => {
    const actions = emptyActions()
    render(
      <EventRowMenu event={baseEvent({ id: 'evt-99' })} actions={actions} />,
    )
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete…' }))
    expect(actions.onRequestDelete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'evt-99' }),
    )
  })

  it('invokes onRequestMarkNonConcert when Mark non-concert is clicked', () => {
    const actions = emptyActions()
    render(<EventRowMenu event={baseEvent()} actions={actions} />)
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Mark non-concert' }))
    expect(actions.onRequestMarkNonConcert).toHaveBeenCalled()
  })
})
