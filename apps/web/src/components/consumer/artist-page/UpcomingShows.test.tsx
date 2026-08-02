// @vitest-environment jsdom

import React from 'react'
import type { ArtistShow } from '@concert-crawl/types'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CONSUMER_COPY } from '../definitions/copy'

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

// Every row carries the app-wide Watch control, which reaches for Clerk and
// React Query. What matters here is the list, not the control.
vi.mock('@/components/consumer/watch-show-button/WatchShowButton', () => ({
  WatchShowButton: () => <button data-testid="watch-stub" type="button" />,
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
  it('counts SHOWS in the show-all control while capping ITEMS in the list', () => {
    const { container, getByText, queryByText } = render(
      <UpcomingShows name="The Cold Fronts" shows={thirteenShows()} />,
    )
    // The head carries no count — it duplicated "Upcoming" and clipped at 320px.
    expect(queryByText(ARTIST_COPY.showCount(13))).toBeNull()
    // A run is one item; the label is always in shows.
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
    // Scoped by name: every row now carries a Watch control, so "no buttons at
    // all" is no longer the same claim as "no show-all toggle".
    const { queryByRole } = render(
      <UpcomingShows
        name="Wax Harbour"
        shows={[show('2026-08-08', 'Hi-Dive', 15)]}
      />,
    )
    expect(queryByRole('button', { name: ARTIST_COPY.showAll(1) })).toBeNull()
    expect(queryByRole('button', { name: ARTIST_COPY.showFewer })).toBeNull()
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
    expect(getByText(CONSUMER_COPY.cancelledLabel)).toBeTruthy()
    expect(getByText('Hi-Dive')).toBeTruthy()
  })

  it('marks a postponed show', () => {
    const { getByText } = render(
      <UpcomingShows
        name="Wax Harbour"
        shows={[show('2026-08-08', 'Hi-Dive', 15, 'postponed')]}
      />,
    )
    expect(getByText(CONSUMER_COPY.postponedLabel)).toBeTruthy()
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

  it('rules under every one-off that has something below it', () => {
    // Item order: one-off, one-off, run. Two rules — the second one-off still
    // needs a bottom edge even though a run card follows it.
    const { container } = render(
      <UpcomingShows
        name="The Cold Fronts"
        shows={[
          show('2026-08-01', 'Solo One'),
          show('2026-08-02', 'Solo Two'),
          show('2026-09-05', "Ophelia's"),
          show('2026-09-06', "Ophelia's"),
          show('2026-09-07', "Ophelia's"),
        ]}
      />,
    )
    expect(container.querySelectorAll('[data-show-divider]')).toHaveLength(2)
  })

  it('draws no rule above the first item or under a run card', () => {
    // Item order: run, one-off. The run card carries its own edge.
    const { container } = render(
      <UpcomingShows
        name="The Cold Fronts"
        shows={[
          show('2026-08-05', "Ophelia's"),
          show('2026-08-06', "Ophelia's"),
          show('2026-08-07', "Ophelia's"),
          show('2026-09-20', 'Solo One'),
        ]}
      />,
    )
    expect(container.querySelectorAll('[data-show-divider]')).toHaveLength(0)
  })
})
