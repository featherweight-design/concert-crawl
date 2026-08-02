// @vitest-environment jsdom

import type { ArtistShow } from '@concert-crawl/types'
import { cleanup, render } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ShowRow } from './ShowRow'

// The real control drags in Clerk + React Query; the contract under test is
// that the row offers one, and that it is not nested inside the row's link.
vi.mock('@/components/consumer/watch-show-button/WatchShowButton', () => ({
  WatchShowButton: () => <button data-testid="watch-stub" type="button" />,
}))

afterEach(cleanup)

const show: ArtistShow = {
  eventId: 'evt_1',
  iso: '2026-09-12',
  showTime: null,
  venue: 'Larimer Lounge',
  venueSlug: 'larimer-lounge',
  city: 'Denver',
  price: null,
  status: 'upcoming',
}

describe('ShowRow', () => {
  // Cold-eyes finding 4: the same event object carries a Watch control on
  // venue detail and carried none here.
  it('offers the same Watch control the rest of the app does', () => {
    const { getByTestId } = render(<ShowRow show={show} artist="Wax Harbour" />)
    expect(getByTestId('watch-stub')).not.toBeNull()
  })

  it('keeps the Watch control OUT of the row link', () => {
    const { container, getByTestId } = render(
      <ShowRow show={show} artist="Wax Harbour" />,
    )
    const link = container.querySelector('a')
    expect(link).not.toBeNull()
    // A button inside an anchor is invalid HTML and steals the row's tap.
    expect(link?.contains(getByTestId('watch-stub'))).toBe(false)
    expect(link?.getAttribute('href')).toBe('/events/evt_1')
  })

  it('still exposes one show item with a 60px tap area', () => {
    const { container } = render(<ShowRow show={show} artist="Wax Harbour" />)
    const item = container.querySelector('[data-show-item]')
    expect(item).not.toBeNull()
    expect(item?.getAttribute('style')).toContain('min-height: 60px')
  })
})
