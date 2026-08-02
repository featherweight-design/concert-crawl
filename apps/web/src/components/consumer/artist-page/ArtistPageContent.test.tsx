// @vitest-environment jsdom

import type { ArtistDetailResponse } from '@concert-crawl/types'
import { cleanup, render } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ArtistPageContent } from './ArtistPageContent'

// The mobile hero renders BackChip, which reaches for the app router.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}))

const base: ArtistDetailResponse = {
  artist: {
    name: 'Neal Francis',
    slug: 'neal-francis',
    spotifyArtistId: null,
    photoUrl: null,
  },
  shows: [],
  past: [],
  history: { count: 0, venues: [] },
  following: null,
}

const withPast: ArtistDetailResponse = {
  ...base,
  past: [
    {
      eventId: 'evt_1',
      iso: '2026-05-04',
      venue: 'Larimer Lounge',
      venueSlug: 'larimer-lounge',
      city: 'Denver',
    },
  ],
  history: { count: 1, venues: ['Larimer Lounge'] },
}

afterEach(cleanup)

describe('ArtistPageContent', () => {
  // The wrapper carries the block's top margin, so rendering it around a
  // PastShows that returned null leaves a visible gap under the last row.
  it('omits the past-shows wrapper entirely when there are no past shows', () => {
    const { container } = render(<ArtistPageContent data={base} />)
    expect(container.querySelector('.ap-block-past')).toBeNull()
  })

  it('renders the past-shows wrapper when there are past shows', () => {
    const { container } = render(<ArtistPageContent data={withPast} />)
    expect(container.querySelector('.ap-block-past')).not.toBeNull()
  })
})
