// @vitest-environment jsdom

import React from 'react'
import type { ArtistShow } from '@concert-crawl/types'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ARTIST_COPY } from './definitions/copy'
import { UpcomingShows } from './UpcomingShows'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

afterEach(cleanup)

const show = (
  iso: string,
  venue: string,
  price: number | null = null,
  status: ArtistShow['status'] = 'upcoming',
): ArtistShow => ({
  eventId: `${venue}-${iso}`,
  iso,
  showTime: null,
  venue,
  venueSlug: venue.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  city: 'Denver',
  price,
  status,
})

/** Three runs of three, plus four one-offs: 5 items, 13 shows. */
const thirteenShows = (): ArtistShow[] => [
  show('2026-08-01', 'Venue A'),
  show('2026-08-02', 'Venue A'),
  show('2026-08-03', 'Venue A'),
  show('2026-09-01', 'Venue B'),
  show('2026-09-02', 'Venue B'),
  show('2026-09-03', 'Venue B'),
  show('2026-10-01', 'Venue C'),
  show('2026-10-02', 'Venue C'),
  show('2026-10-03', 'Venue C'),
  show('2026-11-01', 'Solo One'),
  show('2026-11-02', 'Solo Two'),
  show('2026-11-03', 'Solo Three'),
  show('2026-11-04', 'Solo Four'),
]

describe('UpcomingShows', () => {
  it('counts SHOWS in the heading while capping ITEMS in the list', () => {
    const { container, getByText } = render(
      <UpcomingShows name="The Cold Fronts" shows={thirteenShows()} />,
    )
    // A run is one item; the label is always in shows.
    expect(getByText(ARTIST_COPY.showCount(13))).toBeTruthy()
    expect(container.querySelectorAll('[data-show-item]')).toHaveLength(5)
    expect(getByText(ARTIST_COPY.showAll(13))).toBeTruthy()
  })

  it('expands and collapses from a keyboard-reachable control', () => {
    const { container, getByRole } = render(
      <UpcomingShows name="The Cold Fronts" shows={thirteenShows()} />,
    )
    const toggle = getByRole('button', { name: ARTIST_COPY.showAll(13) })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.style.minHeight).toBe('44px')

    toggle.focus()
    fireEvent.click(toggle)
    expect(container.querySelectorAll('[data-show-item]')).toHaveLength(7)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(toggle.textContent).toBe(ARTIST_COPY.showFewer)
    // Focus never leaves the control that moved the list.
    expect(document.activeElement).toBe(toggle)

    fireEvent.click(toggle)
    expect(container.querySelectorAll('[data-show-item]')).toHaveLength(5)
  })

  it('omits the toggle when everything already fits', () => {
    const { queryByRole } = render(
      <UpcomingShows
        name="Wax Harbour"
        shows={[show('2026-08-08', 'Hi-Dive', 15)]}
      />,
    )
    expect(queryByRole('button')).toBeNull()
  })

  it('links each row to its event and labels the list', () => {
    const { container } = render(
      <UpcomingShows
        name="Wax Harbour"
        shows={[show('2026-08-08', 'Hi-Dive', 15)]}
      />,
    )
    const section = container.querySelector('section')
    expect(section?.getAttribute('aria-label')).toBe(
      ARTIST_COPY.showsListAria('Wax Harbour'),
    )
    const link = container.querySelector('a')
    expect(link?.getAttribute('href')).toBe('/events/Hi-Dive-2026-08-08')
  })

  it('shows a price when we have one and says Price TBD when we do not', () => {
    const { getByText } = render(
      <UpcomingShows
        name="Wax Harbour"
        shows={[
          show('2026-08-08', 'Hi-Dive', 15),
          show('2026-09-08', 'Lost Lake', null),
        ]}
      />,
    )
    expect(getByText('$15')).toBeTruthy()
    expect(getByText(ARTIST_COPY.priceUnknown)).toBeTruthy()
  })

  it('marks a cancelled show without hiding it', () => {
    const { getByText } = render(
      <UpcomingShows
        name="Wax Harbour"
        shows={[show('2026-08-08', 'Hi-Dive', 15, 'cancelled')]}
      />,
    )
    expect(getByText('Cancelled')).toBeTruthy()
    expect(getByText('Hi-Dive')).toBeTruthy()
  })

  it('marks a postponed show', () => {
    const { getByText } = render(
      <UpcomingShows
        name="Wax Harbour"
        shows={[show('2026-08-08', 'Hi-Dive', 15, 'postponed')]}
      />,
    )
    expect(getByText('Postponed')).toBeTruthy()
  })

  it('labels a residency as a run and links every night', () => {
    const { getByText, container } = render(
      <UpcomingShows
        name="The Cold Fronts"
        shows={[
          show('2026-08-05', "Ophelia's", 25),
          show('2026-08-06', "Ophelia's", 25),
          show('2026-08-07', "Ophelia's", 30),
        ]}
      />,
    )
    expect(getByText(ARTIST_COPY.residencyRun(3))).toBeTruthy()
    expect(container.querySelectorAll('a')).toHaveLength(3)
  })
})
