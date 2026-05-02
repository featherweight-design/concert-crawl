'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { getArtistGradientStyle } from './artist-gradient'

interface EventImageProps {
  src: string | null
  alt: string
  artist?: string
  fallbackInitial?: string
  className?: string
  fill?: boolean
  sizes?: string
}

function Fallback({
  artist,
  fallbackInitial,
  alt,
  className,
}: {
  artist: string | undefined
  fallbackInitial: string | undefined
  alt: string
  className: string | undefined
}) {
  const gradientStyle = getArtistGradientStyle(artist ?? fallbackInitial ?? '')
  return (
    <div
      className={cn('flex items-center justify-center select-none', className)}
      style={gradientStyle}
      aria-label={alt}
    >
      <span className="text-2xl font-bold opacity-80">
        {fallbackInitial ?? '♪'}
      </span>
    </div>
  )
}

export function EventImage({
  src,
  alt,
  artist,
  fallbackInitial,
  className,
  fill = false,
  sizes,
}: EventImageProps) {
  const [errored, setErrored] = useState(false)

  if (!src || errored) {
    return (
      <Fallback
        artist={artist}
        fallbackInitial={fallbackInitial}
        alt={alt}
        className={className}
      />
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {fill ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? '(max-width: 768px) 100vw, 50vw'}
          className="object-cover"
          loading="lazy"
          onError={() => setErrored(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setErrored(true)}
        />
      )}
      {/* image-tint overlay — blends hotlinked images into active theme */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--image-tint)' }}
        aria-hidden
      />
    </div>
  )
}
