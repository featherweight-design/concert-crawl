'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { IdentityArt } from '../identity-art/IdentityArt'

type IdentityScale = 'hero' | 'tile' | 'micro'

interface EventImageProps {
  src: string | null
  alt: string
  artist?: string
  identityScale?: IdentityScale
  className?: string
  fill?: boolean
  sizes?: string
}

export function EventImage({
  src,
  alt,
  artist,
  identityScale = 'tile',
  className,
  fill = false,
  sizes,
}: EventImageProps) {
  const [errored, setErrored] = useState(false)

  if (!src || errored) {
    return (
      <IdentityArt
        name={artist ?? alt}
        kind="artist"
        scale={identityScale}
        {...(className !== undefined && { className })}
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
