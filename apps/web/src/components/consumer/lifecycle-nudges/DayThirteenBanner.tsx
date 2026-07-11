'use client'

// Day-13 trial-ends-tomorrow banner (#780, PR 4.2). Two placements per
// the design decisions log: `pinned` (default) — a full-bleed thin strip
// fixed at the very top, above the app bar; `inline` — a rounded inset
// card for content flow (exported for future surfaces; only pinned is
// mounted by LifecycleNudgesGate today).

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PLAN_SETTINGS_ROUTE } from '@/components/consumer/tier-picker/definitions/constants'
import { LIFECYCLE_NUDGES_COPY } from './definitions/copy'
import { DAY13_BANNER_Z_INDEX } from './definitions/constants'

const BANNER_COPY = LIFECYCLE_NUDGES_COPY.banner

interface DayThirteenBannerProps {
  variant: 'pinned' | 'inline'
  onDismiss: () => void
}

export const DayThirteenBanner = ({
  variant,
  onDismiss,
}: DayThirteenBannerProps) => {
  const router = useRouter()
  const inline = variant === 'inline'

  const [wide, setWide] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)')
    setWide(mql.matches)
    const listener = (ev: MediaQueryListEvent) => setWide(ev.matches)
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [])

  const strip = (
    <div
      data-testid="day-thirteen-banner"
      style={{
        boxSizing: 'border-box',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: wide ? 14 : 10,
        padding: inline
          ? wide
            ? '11px 16px'
            : '10px 13px'
          : wide
            ? '10px 20px'
            : '9px 13px',
        margin: 0,
        borderRadius: inline ? 12 : 0,
        background: inline
          ? 'color-mix(in oklch, var(--signal) 10%, var(--surface-1))'
          : 'color-mix(in oklch, var(--signal) 16%, var(--bg-elevated))',
        border: inline
          ? '1px solid color-mix(in oklch, var(--signal) 32%, var(--border))'
          : 'none',
        borderBottom: inline
          ? '1px solid color-mix(in oklch, var(--signal) 32%, var(--border))'
          : '1px solid color-mix(in oklch, var(--signal) 30%, var(--border-strong))',
        color: 'var(--fg)',
      }}
    >
      {/* hourglass */}
      <svg
        width={wide ? 18 : 16}
        height={wide ? 18 : 16}
        viewBox="0 0 16 16"
        aria-hidden
        style={{ flexShrink: 0, color: 'var(--signal)' }}
      >
        <path
          d="M4 2.5 H12 M4 13.5 H12 M4.5 2.5 C4.5 6 11.5 6 11.5 2.5 M4.5 13.5 C4.5 10 11.5 10 11.5 13.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          flexWrap: 'wrap',
          rowGap: 0,
        }}
      >
        <span
          style={{
            fontWeight: 800,
            fontSize: wide ? 14 : 13,
            letterSpacing: '-0.01em',
            color: 'var(--fg)',
          }}
        >
          {BANNER_COPY.title}
        </span>
        <span
          style={{
            fontWeight: 500,
            fontSize: wide ? 13.5 : 12.5,
            color: 'var(--fg-muted)',
            letterSpacing: '-0.005em',
          }}
        >
          {BANNER_COPY.sub}
        </span>
      </div>
      {/* CTA — explicit reset instead of the design's all:unset so UA
          focus styles survive (codebase a11y convention). */}
      <button
        type="button"
        onClick={() => router.push(PLAN_SETTINGS_ROUTE)}
        style={{
          cursor: 'pointer',
          flexShrink: 0,
          border: 'none',
          padding: wide ? '7px 14px' : '6px 12px',
          borderRadius: 8,
          background: 'var(--signal)',
          color: 'var(--fg-on-accent)',
          fontWeight: 800,
          fontSize: wide ? 12.5 : 12,
          letterSpacing: '-0.005em',
        }}
      >
        {BANNER_COPY.cta}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={BANNER_COPY.dismissAria}
        style={{
          cursor: 'pointer',
          flexShrink: 0,
          border: 'none',
          background: 'transparent',
          width: 26,
          height: 26,
          borderRadius: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--fg-subtle)',
          padding: 0,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden>
          <path
            d="M3 3 L13 13 M13 3 L3 13"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )

  if (!inline) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: DAY13_BANNER_Z_INDEX,
        }}
      >
        {strip}
      </div>
    )
  }
  return strip
}
