// Mirrors HistoryLoading, adjusted for the Artists list: a sub-tab bar, a mono
// group heading, and rows whose right column is the follow control.

import type { CSSProperties } from 'react'

import { NF_FOLLOW_SIZES } from '@/components/consumer/artist-page/definitions/constants'

// `CSSProperties` has no room for custom properties, so the two the class pair
// above reads are declared alongside it rather than cast in.
const CONTROL_STYLE: CSSProperties & {
  '--nf-follow-row': string
  '--nf-follow-row-wide': string
} = {
  width: 92,
  '--nf-follow-row': `${NF_FOLLOW_SIZES.row.height}px`,
  '--nf-follow-row-wide': `${NF_FOLLOW_SIZES.rowWide.height}px`,
  borderRadius: 8,
  background: 'var(--surface-2)',
  flexShrink: 0,
}

function ArtistRowSkeleton({ delay }: { delay: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '56px 1fr auto',
        gap: 12,
        alignItems: 'center',
        padding: '11px 16px',
        borderTop: '1px solid var(--border)',
        animation: `skeletonPulse 1.4s ease-in-out ${delay}s infinite`,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 8,
          background: 'var(--surface-2)',
          flexShrink: 0,
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          minWidth: 0,
        }}
      >
        <div
          style={{
            height: 14,
            width: '52%',
            borderRadius: 4,
            background: 'var(--surface-2)',
          }}
        />
        <div
          style={{
            height: 10,
            width: '40%',
            borderRadius: 3,
            background: 'var(--surface-2)',
          }}
        />
      </div>
      {/* The real list changes density at `sm`: a mobile row takes `row`, the
          desktop card takes `rowWide`. A server component cannot branch on
          viewport, so the two heights go out as custom properties and the
          breakpoint picks between them in CSS. Both values are read from the
          size table, never copied — a literal here is how the skeleton and the
          control it stands in for drift apart. */}
      <div
        className="h-[var(--nf-follow-row)] sm:h-[var(--nf-follow-row-wide)]"
        style={CONTROL_STYLE}
      />
    </div>
  )
}

export default function FollowingLoading() {
  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: 2,
          background: 'var(--accent)',
          animation: 'navProgress 3s ease-out forwards',
          zIndex: 9999,
        }}
      />
      <main className="mx-auto w-full max-w-[940px] flex-1 px-4 pb-20 pt-4 sm:px-[30px] sm:pb-10 sm:pt-7">
        {/* Sub-tab bar */}
        <div
          className="mb-4 sm:mb-6"
          style={{
            height: 44,
            borderRadius: 10,
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            animation: 'skeletonPulse 1.4s ease-in-out infinite',
          }}
        />

        {/* Group heading */}
        <div
          style={{
            height: 10,
            width: 108,
            borderRadius: 3,
            background: 'var(--surface-2)',
            margin: '13px 0 9px',
            animation: 'skeletonPulse 1.4s ease-in-out 0.06s infinite',
          }}
        />

        <div className="-mx-4 sm:mx-0">
          {Array.from({ length: 5 }).map((_, idx) => (
            <ArtistRowSkeleton key={idx} delay={0.1 + idx * 0.07} />
          ))}
        </div>
      </main>
    </>
  )
}
