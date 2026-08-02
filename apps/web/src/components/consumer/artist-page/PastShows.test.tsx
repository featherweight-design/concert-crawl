// @vitest-environment jsdom

import React from 'react'
import type { ArtistPastShow } from '@concert-crawl/types'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CRAWL_SINCE } from './definitions/constants'
import { ARTIST_COPY } from './definitions/copy'
import { PastShows } from './PastShows'

afterEach(cleanup)

const past = (iso: string, venue: string): ArtistPastShow => ({
  eventId: `${venue}-${iso}`,
  iso,
  venue,
  venueSlug: venue.toLowerCase(),
  city: 'Denver',
})

describe('PastShows', () => {
  it('renders nothing when we have no record', () => {
    const { container } = render(<PastShows name="Cassette Sunday" past={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('lists each show with no price, no link and no setlist', () => {
    const { container, getByText } = render(
      <PastShows
        name="Nightjar Choir"
        past={[
          past('2026-06-21', 'Larimer Lounge'),
          past('2026-05-09', 'Globe Hall'),
        ]}
      />,
    )
    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect(container.querySelectorAll('a')).toHaveLength(0)
    expect(getByText('Larimer Lounge')).toBeTruthy()
    expect(container.textContent).not.toContain('$')
  })

  it('says out loud where the record stops', () => {
    const { getByText } = render(
      <PastShows
        name="Nightjar Choir"
        past={[past('2026-06-21', 'Larimer Lounge')]}
      />,
    )
    expect(getByText(ARTIST_COPY.pastNote(CRAWL_SINCE))).toBeTruthy()
  })

  it('labels the section and heads it with a real h2', () => {
    const { container } = render(
      <PastShows
        name="Nightjar Choir"
        past={[past('2026-06-21', 'Larimer Lounge')]}
      />,
    )
    expect(container.querySelector('section')?.getAttribute('aria-label')).toBe(
      ARTIST_COPY.pastListAria('Nightjar Choir'),
    )
    expect(container.querySelector('h2')?.textContent).toBe(
      ARTIST_COPY.pastTitle,
    )
  })

  it('counts the rows in the section head, the way Upcoming does', () => {
    const { getByText, rerender } = render(
      <PastShows
        name="Nightjar Choir"
        past={[
          past('2026-06-21', 'Larimer Lounge'),
          past('2026-05-09', 'Globe Hall'),
        ]}
      />,
    )
    expect(getByText(ARTIST_COPY.showCount(2))).toBeTruthy()

    rerender(
      <PastShows
        name="Nightjar Choir"
        past={[past('2026-06-21', 'Larimer Lounge')]}
      />,
    )
    expect(getByText(ARTIST_COPY.showCount(1))).toBeTruthy()
  })
})
