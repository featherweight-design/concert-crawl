'use client'

import React, { useEffect, useState } from 'react'

import { IdentityArt } from '../identity-art/IdentityArt'

interface ArtistPlateProps {
  name: string
  /** Press photo URL, or null when we have none. */
  photo: string | null
  /** Fixed container height — the plate never reflows when the layer swaps. */
  height: number
  className?: string
}

/**
 * The hero image. A press-photo URL can be signed and expire between the
 * server render and the browser's image request, so a null check at fetch time
 * is not sufficient — the `error` handler is the second, render-time gate. The
 * container height is fixed so the swap costs no layout shift.
 */
export const ArtistPlate = ({
  name,
  photo,
  height,
  className,
}: ArtistPlateProps) => {
  const [failed, setFailed] = useState(false)

  // A new URL is a new chance: reset the error gate when the prop changes.
  useEffect(() => {
    setFailed(false)
  }, [photo])

  const showPhoto = Boolean(photo) && !failed

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height,
        overflow: 'hidden',
      }}
    >
      {showPhoto && photo ? (
        <img
          src={photo}
          alt=""
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        // Artists draw from the mesh/stripes/concentric/halftone pool;
        // blueprint is venue-only, so no templateOverride is passed.
        <IdentityArt
          name={name}
          kind="artist"
          scale="hero"
          showInitials={name.trim().length > 0}
          grain={0.1}
          style={{ position: 'absolute', inset: 0 }}
        />
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--image-tint)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
        style={{ background: 'linear-gradient(transparent, var(--bg))' }}
      />
    </div>
  )
}
