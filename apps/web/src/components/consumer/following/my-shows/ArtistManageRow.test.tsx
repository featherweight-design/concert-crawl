// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { FollowedArtist } from '@concert-crawl/types'
import { ArtistManageRow } from './ArtistManageRow'
import { MY_SHOWS_ARTISTS_COPY } from './definitions/copy'
import { ARTIST_COPY } from '@/components/consumer/artist-page/definitions/copy'

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('token') }),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/following',
  useSearchParams: () => new URLSearchParams(),
}))

afterEach(cleanup)

const artist = (over: Partial<FollowedArtist> = {}): FollowedArtist => ({
  name: 'Wax Harbour',
  slug: 'wax-harbour',
  canonicalName: 'wax harbour',
  photoUrl: null,
  source: 'manual',
  followedAt: '2026-08-01T00:00:00.000Z',
  nextShow: {
    eventId: 'evt-1',
    iso: '2026-09-12',
    venue: 'Bluebird Theater',
    venueSlug: 'bluebird-theater',
    price: 28,
  },
  ...over,
})

const noop = () => {}

describe('ArtistManageRow', () => {
  it('links the name at its artist page', () => {
    render(<ArtistManageRow artist={artist()} onEntitlementRequired={noop} />)

    expect(screen.getByRole('link', { name: 'Wax Harbour' })).toHaveAttribute(
      'href',
      '/artists/wax-harbour',
    )
  })

  it('renders the venue and date line', () => {
    render(<ArtistManageRow artist={artist()} onEntitlementRequired={noop} />)

    expect(screen.getByText(/Bluebird Theater/)).toBeInTheDocument()
  })

  it('says so when nothing is announced', () => {
    render(
      <ArtistManageRow
        artist={artist({ nextShow: null })}
        onEntitlementRequired={noop}
      />,
    )

    expect(
      screen.getByText(MY_SHOWS_ARTISTS_COPY.groups.noDates),
    ).toBeInTheDocument()
  })

  // A Spotify-synced act never billed in Denver has no projection row, so no
  // page to route to and no slug to key the follow endpoint by.
  it('renders a slug-less follow unlinked and with no control', () => {
    render(
      <ArtistManageRow
        artist={artist({ slug: null })}
        onEntitlementRequired={noop}
      />,
    )

    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Wax Harbour')).toBeInTheDocument()
  })

  it('marks a Spotify-sourced row and leaves a manual one unmarked', () => {
    render(
      <ArtistManageRow
        artist={artist({ source: 'spotify_followed' })}
        onEntitlementRequired={noop}
      />,
    )
    expect(
      screen.getByText(MY_SHOWS_ARTISTS_COPY.source.spotify),
    ).toBeInTheDocument()

    cleanup()
    render(<ArtistManageRow artist={artist()} onEntitlementRequired={noop} />)
    expect(screen.queryByText(MY_SHOWS_ARTISTS_COPY.source.spotify)).toBeNull()
  })

  it('carries the shipped follow control, already following', () => {
    render(<ArtistManageRow artist={artist()} onEntitlementRequired={noop} />)

    const button = screen.getByRole('button', {
      name: ARTIST_COPY.followingAria('Wax Harbour'),
    })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    // Never disabled: unfollowing is how you leave, and a disabled control
    // would strand a downgraded user on a list they cannot edit.
    expect(button).not.toBeDisabled()
  })

  it('keeps the control label in the desktop card variant', () => {
    render(
      <ArtistManageRow
        artist={artist()}
        variant="card"
        onEntitlementRequired={noop}
      />,
    )

    expect(
      screen.getByRole('button', {
        name: ARTIST_COPY.followingAria('Wax Harbour'),
      }).textContent,
    ).not.toBe('')
  })

  it('drops the control label only at 320px', () => {
    render(
      <ArtistManageRow artist={artist()} narrow onEntitlementRequired={noop} />,
    )

    expect(
      screen.getByRole('button', {
        name: ARTIST_COPY.followingAria('Wax Harbour'),
      }).textContent,
    ).toBe('')
  })

  it('hides the artwork from the accessibility tree', () => {
    const { container } = render(
      <ArtistManageRow artist={artist()} onEntitlementRequired={noop} />,
    )

    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })
})
