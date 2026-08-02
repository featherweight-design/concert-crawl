import React from 'react'

import { ARTIST_COPY } from '../definitions/copy'

/**
 * Two independent loading clocks live on this page: the artist payload and the
 * Spotify iframe. These skeletons stand in for the FIRST one only, so the page
 * never waits on a third-party rectangle to paint.
 *
 * Every block here is decorative — the region announces itself once, on
 * ShowsSkeleton, rather than once per shimmering box.
 */

const skel = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--surface-2)',
  animation: 'skeletonPulse 1.4s ease-in-out infinite',
  ...extra,
})

export const HeroSkeleton = ({ height }: { height: number }) => (
  <div aria-hidden="true" style={skel({ width: '100%', height })} />
)

interface TextSkeletonProps {
  /** Width as a CSS length — the design table specifies percentages. */
  width: string
  height?: number
  marginTop?: number
}

export const TextSkeleton = ({
  width,
  height = 12,
  marginTop = 0,
}: TextSkeletonProps) => (
  <div
    aria-hidden="true"
    style={skel({ width, height, marginTop, borderRadius: 4 })}
  />
)

export const ShowsSkeleton = ({ rows }: { rows: number }) => (
  <div
    role="status"
    aria-busy="true"
    style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
  >
    <span className="sr-only">{ARTIST_COPY.loadingArtist}</span>
    {Array.from({ length: rows }, (_, index) => (
      <div
        key={index}
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minHeight: 44,
        }}
      >
        <div
          style={skel({
            width: 44,
            height: 40,
            borderRadius: 8,
            flexShrink: 0,
          })}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <TextSkeleton width="62%" height={13} />
          <TextSkeleton width="34%" height={10} marginTop={7} />
        </div>
        <div
          style={skel({
            width: 42,
            height: 22,
            borderRadius: 6,
            flexShrink: 0,
          })}
        />
      </div>
    ))}
  </div>
)
