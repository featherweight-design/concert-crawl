'use client'

import { useIsMobileViewport } from '@/lib/hooks/useIsMobileViewport'
import { Shimmer, ShimmerKeyframes } from './CrewRowSkeleton'
import { CREWS_COPY } from './definitions/copy'

/**
 * Shape only. It renders neither the crew's name nor its patch, because both
 * would be guesses and a wrong patch flashes a wrong identity for a frame.
 */
export const CrewHomeSkeleton = () => {
  const wide = !useIsMobileViewport()
  const size = wide ? 92 : 72

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 pb-10 pt-5">
      <ShimmerKeyframes />
      {/* Visible rather than sr-only: a live region that mounts with its text
          already in it is not reliably spoken, and this branch mounts loading. */}
      <span
        aria-live="polite"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.18em',
          color: 'var(--fg-subtle)',
        }}
      >
        {CREWS_COPY.net.loadingCrew}
      </span>

      <div className="flex items-center gap-4">
        <Shimmer width={size} height={size} radius={22} />
        <span className="flex flex-1 flex-col gap-2.5">
          <Shimmer width="62%" height={26} />
          <Shimmer width="38%" height={10} />
        </span>
      </div>

      <div className="flex items-center gap-2">
        {[132, 104, 44].map((width) => (
          <Shimmer key={width} width={width} height={36} radius={10} />
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        {['a', 'b', 'c'].map((key, index) => (
          <Shimmer
            key={key}
            width={[104, 104, 92][index] ?? 104}
            height={34}
            radius={8}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {[0, 1, 2].map((key) => (
          <Shimmer key={key} width="100%" height={70} radius={10} />
        ))}
      </div>
    </div>
  )
}
