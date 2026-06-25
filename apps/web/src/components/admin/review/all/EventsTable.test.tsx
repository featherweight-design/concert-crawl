// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EventsTable } from './EventsTable'
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

describe('EventsTable', () => {
  it('renders one row per event with title, artist, venue, genre', () => {
    render(
      <EventsTable
        events={[
          baseEvent(),
          baseEvent({ id: 'evt-2', title: 'King Krule', artist: 'King Krule' }),
        ]}
        onRowClick={() => {}}
      />,
    )
    expect(screen.getByText('Lord Huron')).toBeTruthy()
    expect(screen.getByText('King Krule')).toBeTruthy()
    expect(
      screen.getAllByText('Mission Ballroom').length,
    ).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('indie').length).toBeGreaterThanOrEqual(1)
  })

  it('renders Verified badge for verified events', () => {
    render(
      <EventsTable
        events={[baseEvent({ verified: true })]}
        onRowClick={() => {}}
      />,
    )
    expect(screen.getByText('Verified')).toBeTruthy()
  })

  it('renders Unverified badge for unverified events', () => {
    render(
      <EventsTable
        events={[baseEvent({ verified: false })]}
        onRowClick={() => {}}
      />,
    )
    expect(screen.getByText('Unverified')).toBeTruthy()
  })

  it('renders Sold out badge when isSoldOut=true', () => {
    render(
      <EventsTable
        events={[baseEvent({ isSoldOut: true })]}
        onRowClick={() => {}}
      />,
    )
    expect(screen.getByText('Sold out')).toBeTruthy()
  })

  it('renders Postponed lifecycle when status=postponed', () => {
    render(
      <EventsTable
        events={[baseEvent({ status: 'postponed' })]}
        onRowClick={() => {}}
      />,
    )
    expect(screen.getByText('Postponed')).toBeTruthy()
  })

  it('renders Cancelled lifecycle when status=cancelled', () => {
    render(
      <EventsTable
        events={[baseEvent({ status: 'cancelled' })]}
        onRowClick={() => {}}
      />,
    )
    expect(screen.getByText('Cancelled')).toBeTruthy()
  })

  it('invokes onRowClick with the event id when a row is clicked', () => {
    const onRowClick = vi.fn()
    render(
      <EventsTable
        events={[baseEvent({ id: 'evt-9' })]}
        onRowClick={onRowClick}
      />,
    )
    fireEvent.click(screen.getByText('Lord Huron'))
    expect(onRowClick).toHaveBeenCalledWith('evt-9')
  })

  it('falls back to em dash when venueName is null', () => {
    render(
      <EventsTable
        events={[baseEvent({ venueName: null })]}
        onRowClick={() => {}}
      />,
    )
    expect(screen.getByText('—')).toBeTruthy()
  })
})
