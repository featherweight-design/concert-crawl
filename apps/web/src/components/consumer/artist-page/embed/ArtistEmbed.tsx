'use client'

import React, { useEffect, useState } from 'react'

import { EMBED_H } from '../definitions/constants'
import { ARTIST_COPY } from '../definitions/copy'

import { EmbedRail } from './EmbedRail'
import { embedPlate, EMBED_LIGHT_PLATE } from './embed-plate'
import { EmbedSkipLink } from './EmbedSkipLink'

interface ArtistEmbedProps {
  name: string
  spotifyArtistId: string | null
  /** Anchor the skip link targets, or null when the player is the last block. */
  skipTo: string | null
  /** Active theme key — decides the plate colour we hand the iframe. */
  themeKey: string
}

/**
 * Direction B · Mat (plan open item #5). `EmbedShelf` and `EmbedFlush` exist in
 * the prototype as the arguable alternatives and are deliberately not built.
 *
 * Clock 2: this block never blocks the page and never moves the shows list.
 * The mat reserves the iframe's exact final height, so whenever Spotify paints,
 * nothing below it shifts.
 */
export const ArtistEmbed = ({
  name,
  spotifyArtistId,
  skipTo,
  themeKey,
}: ArtistEmbedProps) => {
  // The active theme lives in localStorage, so the SERVER cannot know it. If we
  // resolve the plate during SSR the first client render disagrees and React
  // logs a hydration mismatch it explicitly "won't patch up" — which can leave
  // the wrong plate painted for the whole visit. Both sides therefore start on
  // the theme-independent dark plate (right for every light theme, and never
  // wrong enough to read as a fault on a dark one) and the theme's own surface
  // arrives on the next commit.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const plate = mounted ? embedPlate(themeKey) : EMBED_LIGHT_PLATE

  // Absent wins over every other branch — an unresolved Spotify match is a
  // fact about our data, not a loading state.
  if (!spotifyArtistId) {
    return (
      <section aria-label={ARTIST_COPY.playerAria(name)}>
        <EmbedRail label={ARTIST_COPY.playerNoneRail} />
        <p
          style={{
            margin: 0,
            fontFamily: 'Inter, system-ui',
            fontSize: 13.5,
            lineHeight: 1.5,
            textWrap: 'pretty',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--fg-muted)' }}>
            {ARTIST_COPY.playerNone}
          </span>{' '}
          <span style={{ fontWeight: 500, color: 'var(--fg-subtle)' }}>
            {skipTo === null
              ? ARTIST_COPY.playerNoneSubLast
              : ARTIST_COPY.playerNoneSub}
          </span>
        </p>
      </section>
    )
  }

  return (
    <section aria-label={ARTIST_COPY.playerAria(name)}>
      <EmbedRail
        label={ARTIST_COPY.playerRail}
        note={ARTIST_COPY.playerRailThirdParty}
      />
      <EmbedSkipLink targetId={skipTo} />
      <div
        data-embed-mat=""
        style={{
          padding: 8,
          borderRadius: 12,
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
        }}
      >
        <iframe
          src={`https://open.spotify.com/embed/artist/${spotifyArtistId}`}
          title={ARTIST_COPY.playerTitle(name)}
          height={EMBED_H.compact}
          loading="lazy"
          allow="encrypted-media"
          // The plate is the only value we send Spotify, and it has to be a
          // resolved hex — the iframe cannot read `var(--*)` from our document.
          data-plate={plate}
          style={{
            width: '100%',
            border: 0,
            borderRadius: 8,
            display: 'block',
            background: plate,
          }}
        />
      </div>
      <p
        style={{
          margin: '8px 0 0',
          fontFamily: 'Inter, system-ui',
          fontSize: 11.5,
          lineHeight: 1.45,
          color: 'var(--fg-subtle)',
          textWrap: 'pretty',
        }}
      >
        {ARTIST_COPY.playerPreviewNote}
      </p>
    </section>
  )
}
