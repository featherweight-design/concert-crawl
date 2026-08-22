// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EventsMobileList } from './EventsMobileList'
import { type AllEvent } from './types'

const baseEvent = (overrides: Partial<AllEvent> = {}): AllEvent => ({
  id: 'evt-1',
  title: 'Lord Huron',
  artist: 'Lord Huron',
  venueId: 'venue-1',
  venueName: 'Mission Ballroom',
  date: '2026-07-12',
  doorsTime: '19:00',
  showTime: '20:00',
  ticketPriceMin: '35',
  ticketPriceMax: '60',
  confidenceScore: 0.82,
  verified: true,
  status: 'upcoming',
  extractionStrategy: 'json-ld',
  sourceUrl: null,
  genre: ['indie', 'folk'],
  createdAt: '2026-06-12T18:14:00Z',
  isSoldOut: false,
  hiddenFromConsumer: false,
  isConcertReviewNeeded: false,
  ...overrides,
})

// Mobile and desktop must show the same classification badges — a misclassified
// concert that is only visible on one breakpoint is still a concert nobody finds.
describe('EventsMobileList — classification badges', () => {
  it('renders the non-concert badge when hiddenFromConsumer=true', () => {
    render(
      <EventsMobileList
        events={[baseEvent({ hiddenFromConsumer: true })]}
        onRowClick={() => {}}
      />,
    )
    expect(screen.getByText('non-concert')).toBeTruthy()
  })

  it('renders the needs-review badge when isConcertReviewNeeded=true', () => {
    render(
      <EventsMobileList
        events={[baseEvent({ isConcertReviewNeeded: true })]}
        onRowClick={() => {}}
      />,
    )
    expect(screen.getByText('needs review')).toBeTruthy()
  })

  // The two bits are independent, so a visible event can still be flagged.
  it('renders the needs-review badge on a visible event', () => {
    render(
      <EventsMobileList
        events={[
          baseEvent({
            hiddenFromConsumer: false,
            isConcertReviewNeeded: true,
          }),
        ]}
        onRowClick={() => {}}
      />,
    )
    expect(screen.getByText('needs review')).toBeTruthy()
    expect(screen.queryByText('non-concert')).toBeNull()
  })

  it('renders neither classification badge on an ordinary card', () => {
    render(<EventsMobileList events={[baseEvent()]} onRowClick={() => {}} />)
    expect(screen.queryByText('non-concert')).toBeNull()
    expect(screen.queryByText('needs review')).toBeNull()
  })
})

describe('EventsMobileList', () => {
  it('renders one card per event', () => {
    render(
      <EventsMobileList
        events={[
          baseEvent(),
          baseEvent({ id: 'evt-2', title: 'King Krule', artist: 'King Krule' }),
        ]}
        onRowClick={() => {}}
      />,
    )
    expect(screen.getByText('Lord Huron')).toBeTruthy()
    expect(screen.getByText('King Krule')).toBeTruthy()
  })

  it('invokes onRowClick with the event id when a card is clicked', () => {
    const onRowClick = vi.fn()
    render(
      <EventsMobileList
        events={[baseEvent({ id: 'evt-9' })]}
        onRowClick={onRowClick}
      />,
    )
    fireEvent.click(screen.getByText('Lord Huron'))
    expect(onRowClick).toHaveBeenCalledWith('evt-9')
  })
})
