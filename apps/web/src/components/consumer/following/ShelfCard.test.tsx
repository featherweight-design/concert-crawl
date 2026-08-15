// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { ShelfArtist } from './definitions/types'

vi.mock('@/components/consumer/artist-page/lib/use-artist-follow', () => ({
  useArtistFollow: (_slug: string, initialFollowing: boolean) => ({
    following: initialFollowing,
    toggle: vi.fn(),
  }),
}))

import { ShelfCard } from './ShelfCard'
import { SHELF_CARD_WIDTH } from '@/components/consumer/definitions/constants'

const artist = (overrides: Partial<ShelfArtist> = {}): ShelfArtist => ({
  key: 'k1',
  name: 'Thee Sacred Souls',
  slug: 'thee-sacred-souls',
  eventId: 'evt-1',
  photoUrl: null,
  dateLine: 'Larimer Lounge · Sep 12',
  price: 32,
  following: false,
  ...overrides,
})

const renderCard = (overrides: Partial<ShelfArtist> = {}) =>
  render(
    <ShelfCard
      artist={artist(overrides)}
      width={SHELF_CARD_WIDTH}
      starter={false}
      locked={false}
      signedOut={false}
      onGatedTap={vi.fn()}
      onEntitlementRequired={vi.fn()}
    />,
  )

describe('ShelfCard link precedence', () => {
  it('links to the event when a next show is known', () => {
    renderCard()

    expect(screen.getByRole('link')).toHaveAttribute('href', '/events/evt-1')
  })

  it('falls back to the artist page when there is no next show', () => {
    renderCard({ eventId: null, dateLine: null, price: null })

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/artists/thee-sacred-souls',
    )
  })

  it('renders inert when neither is known', () => {
    renderCard({ eventId: null, slug: null, dateLine: null, price: null })

    expect(screen.queryByRole('link')).toBeNull()
  })
})
