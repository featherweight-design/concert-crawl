// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { EMBED_H } from '../definitions/constants'
import { ARTIST_COPY } from '../definitions/copy'

import { ArtistEmbed } from './ArtistEmbed'
import { embedPlate, EMBED_LIGHT_PLATE } from './embed-plate'

afterEach(cleanup)

describe('ArtistEmbed — the player', () => {
  it('renders the iframe with the attributes Spotify needs and we own', () => {
    const { container } = render(
      <ArtistEmbed
        name="Neal Francis"
        spotifyArtistId="abc123"
        skipTo="upcoming"
        themeKey="electric"
      />,
    )
    const frame = container.querySelector('iframe')
    expect(frame).not.toBeNull()
    expect(frame?.getAttribute('src')).toBe(
      'https://open.spotify.com/embed/artist/abc123',
    )
    expect(frame?.getAttribute('title')).toBe(
      ARTIST_COPY.playerTitle('Neal Francis'),
    )
    expect(frame?.getAttribute('loading')).toBe('lazy')
    expect(frame?.getAttribute('allow')).toBe('encrypted-media')
    expect(frame?.getAttribute('height')).toBe(String(EMBED_H.compact))
    expect(frame?.style.width).toBe('100%')
    expect(frame?.style.borderRadius).toBe('8px')
  })

  it('passes the resolved plate hex to the iframe, never a CSS variable', () => {
    const { container } = render(
      <ArtistEmbed
        name="Neal Francis"
        spotifyArtistId="abc123"
        skipTo="upcoming"
        themeKey="light"
      />,
    )
    const frame = container.querySelector('iframe')
    // Light themes still get a dark plate — the iframe interior is always dark.
    expect(frame?.getAttribute('data-plate')).toBe(EMBED_LIGHT_PLATE)
  })

  // The server cannot know the visitor's theme — it is in localStorage. Handing
  // the iframe a theme-derived hex during SSR makes the FIRST client render
  // disagree, and React logs a hydration mismatch it explicitly "won't patch
  // up", which can leave the wrong plate painted for the whole visit. The
  // first paint is therefore theme-independent and the real plate arrives on
  // the next commit.
  it('paints a theme-independent plate on the server so hydration matches', () => {
    const html = renderToString(
      <ArtistEmbed
        name="Neal Francis"
        spotifyArtistId="abc123"
        skipTo="upcoming"
        themeKey="electric"
      />,
    )
    expect(html).toContain(`data-plate="${EMBED_LIGHT_PLATE}"`)
    expect(html).not.toContain('#11162E')

    // Mounted, the dark theme's own surface takes over.
    const { container } = render(
      <ArtistEmbed
        name="Neal Francis"
        spotifyArtistId="abc123"
        skipTo="upcoming"
        themeKey="electric"
      />,
    )
    expect(container.querySelector('iframe')?.getAttribute('data-plate')).toBe(
      embedPlate('electric'),
    )
  })

  it('labels the rail as a third-party surface', () => {
    const { getByText } = render(
      <ArtistEmbed
        name="Neal Francis"
        spotifyArtistId="abc123"
        skipTo="upcoming"
        themeKey="electric"
      />,
    )
    expect(getByText(ARTIST_COPY.playerRail)).toBeTruthy()
    expect(getByText(ARTIST_COPY.playerRailThirdParty)).toBeTruthy()
  })

  it('renders the skip link only when there are shows to skip to', () => {
    const { queryByRole, rerender } = render(
      <ArtistEmbed
        name="Neal Francis"
        spotifyArtistId="abc123"
        skipTo="upcoming"
        themeKey="electric"
      />,
    )
    const link = queryByRole('link', { name: ARTIST_COPY.playerSkip })
    expect(link?.getAttribute('href')).toBe('#upcoming')

    // No shows → the player is the LAST block, so a "skip to shows" link
    // would move focus backwards past content already read.
    rerender(
      <ArtistEmbed
        name="Neal Francis"
        spotifyArtistId="abc123"
        skipTo={null}
        themeKey="electric"
      />,
    )
    expect(queryByRole('link', { name: ARTIST_COPY.playerSkip })).toBeNull()
  })

  it('says so plainly when we have no player — no box, no icon, no retry', () => {
    const { container, getByText, queryByRole } = render(
      <ArtistEmbed
        name="Neal Francis"
        spotifyArtistId={null}
        skipTo="upcoming"
        themeKey="electric"
      />,
    )
    expect(getByText(ARTIST_COPY.playerNoneRail)).toBeTruthy()
    expect(container.textContent).toContain(ARTIST_COPY.playerNone)
    expect(container.textContent).toContain(ARTIST_COPY.playerNoneSub)
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(queryByRole('button')).toBeNull()
    // A hole reads as an error; a sentence reads as a fact.
    expect(container.querySelector('[data-embed-mat]')).toBeNull()
  })
})
