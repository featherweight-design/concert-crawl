// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { ArtistSearchResult } from '@concert-crawl/types'

vi.mock('@/components/consumer/artist-page/FollowButton', () => ({
  FollowButton: () => <button data-testid="follow-stub" type="button" />,
}))

vi.mock('@/components/consumer/artist-page/lib/use-artist-follow', () => ({
  useArtistFollow: () => ({
    following: false,
    pending: false,
    toggle: () => {},
  }),
}))

import { ArtistResultRow } from './ArtistResultRow'

afterEach(cleanup)

const ARTIST: ArtistSearchResult = {
  name: 'Turnstile',
  slug: 'turnstile',
  photoUrl: null,
  upcomingShowCount: 2,
  following: false,
}

const renderRow = (artist: ArtistSearchResult) =>
  render(
    <ArtistResultRow
      artist={artist}
      selected={false}
      onNavigate={() => {}}
      isSignedIn={false}
      surface={null}
      onLockedTap={() => {}}
      onEntitlementRequired={() => {}}
      size="md"
      iconOnly={false}
    />,
  )

// #1525 — an artist surface resolves portrait, then the generated mark. It
// never reaches an event's artwork, so there is no second source to pass.
describe('<ArtistResultRow /> imagery', () => {
  it('renders the portrait when the artist has one', () => {
    const portrait = 'https://example.test/artist.jpg'
    const { container } = renderRow({ ...ARTIST, photoUrl: portrait })

    expect(container.querySelector('img')?.getAttribute('src')).toBe(portrait)
  })

  it('renders identity art rather than any photo when there is no portrait', () => {
    const { container } = renderRow(ARTIST)

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
