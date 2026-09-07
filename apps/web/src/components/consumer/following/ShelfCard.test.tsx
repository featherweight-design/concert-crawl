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
import { NF_FOLLOW_SIZES } from '@/components/consumer/artist-page/definitions/constants'

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

const renderCard = (overrides: Partial<ShelfArtist> = {}, starter = false) =>
  render(
    <ShelfCard
      artist={artist(overrides)}
      width={SHELF_CARD_WIDTH}
      starter={starter}
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

// The badge was a hand-rolled 34px circle answering to nothing. It now takes
// its geometry from the same table every other follow affordance reads, and
// keeps only the on-art skin that table cannot express.
describe('ShelfCard follow badge', () => {
  it('draws at the size table badge, with a 44px target around it', () => {
    renderCard({}, true)

    const badge = screen.getByRole('button')
    const diameter = `${NF_FOLLOW_SIZES.badge.height}px`
    expect(badge.style.width).toBe(diameter)
    expect(badge.style.height).toBe(diameter)
    expect(badge.style.borderRadius).toBe(`${NF_FOLLOW_SIZES.badge.radius}px`)

    const overlay = badge.querySelector<HTMLElement>('[data-hit-overlay]')
    // The 44 is the WCAG requirement, so it is written out rather than read
    // from `NF_TAP_MIN`: a test that takes its target from the same constant
    // the component does cannot notice the target being lowered. The sum is
    // what makes the literal safe — the circle and its overlay have to add up.
    expect(overlay?.style.inset).toBe('-9px')
    expect(NF_FOLLOW_SIZES.badge.height + 9 * 2).toBe(44)
  })
})
