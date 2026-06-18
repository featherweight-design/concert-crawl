// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import type { EventWithVenue } from '@concert-crawl/types'

vi.mock('../event-card/EventCard', () => ({
  EventCard: ({ event }: { event: EventWithVenue }) => (
    <div data-testid="event-card" data-event-id={event.id} />
  ),
}))

vi.mock('../definitions/lib', () => ({
  dateGroupLabel: (date: string) => {
    if (date === '2099-07-15') return 'Tonight'
    if (date === '2099-07-16') return 'Tomorrow'
    return `Day ${date}`
  },
}))

import { VenueEventList } from './VenueEventList'

function makeEvent(overrides: Partial<EventWithVenue>): EventWithVenue {
  return {
    id: 'ev-1',
    venueId: 'v-1',
    title: 'Show',
    artist: 'Artist',
    date: '2099-07-15',
    doorsTime: null,
    showTime: '20:00',
    ticketUrl: null,
    ticketPriceMin: null,
    ticketPriceMax: null,
    priceSource: null,
    pipelineExhaustedAt: null,
    description: null,
    imageUrl: null,
    genre: null,
    status: 'upcoming',
    confidenceScore: null,
    verified: false,
    sourceUrl: null,
    createdAt: '',
    updatedAt: '',
    venue: {
      id: 'v-1',
      name: 'Bluebird Theater',
      slug: 'bluebird-theater',
      city: 'Denver',
      websiteUrl: 'https://example.com',
      timezone: 'America/Denver',
    },
    ...overrides,
  }
}

describe('VenueEventList date grouping', () => {
  it('renders one section per unique event.date with the date label', () => {
    const events = [
      makeEvent({ id: 'a', date: '2099-07-15' }),
      makeEvent({ id: 'b', date: '2099-07-15' }),
      makeEvent({ id: 'c', date: '2099-07-16' }),
    ]
    const { getAllByRole } = render(<VenueEventList events={events} />)

    const sections = getAllByRole('region')
    expect(sections.length).toBe(2)
    expect(sections[0]?.getAttribute('aria-label')).toBe('Tonight')
    expect(sections[1]?.getAttribute('aria-label')).toBe('Tomorrow')
  })

  it('renders show count per group with correct pluralization', () => {
    const events = [
      makeEvent({ id: 'a', date: '2099-07-15' }),
      makeEvent({ id: 'b', date: '2099-07-15' }),
      makeEvent({ id: 'c', date: '2099-07-16' }),
    ]
    const { getAllByRole } = render(<VenueEventList events={events} />)
    const sections = getAllByRole('region')

    expect(sections[0]?.textContent).toContain('2 shows')
    expect(sections[1]?.textContent).toContain('1 show')
    expect(sections[1]?.textContent).not.toContain('1 shows')
  })

  it('renders every event under its date group', () => {
    const events = [
      makeEvent({ id: 'a', date: '2099-07-15' }),
      makeEvent({ id: 'b', date: '2099-07-16' }),
      makeEvent({ id: 'c', date: '2099-07-15' }),
    ]
    const { getAllByTestId } = render(<VenueEventList events={events} />)
    const cards = getAllByTestId('event-card')
    expect(cards.map((node) => node.getAttribute('data-event-id'))).toEqual([
      'a',
      'c',
      'b',
    ])
  })

  it('renders nothing when events array is empty', () => {
    const { queryAllByRole } = render(<VenueEventList events={[]} />)
    expect(queryAllByRole('region')).toEqual([])
  })
})
