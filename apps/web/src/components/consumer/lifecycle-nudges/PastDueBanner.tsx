'use client'

// Past-due payment banner (#775, PR 4.3). Two placements per the design
// property table (docs/superpowers/design-tables/past-due-surfaces.md):
// `pinned` (default) — a full-bleed warning strip fixed at the very top,
// above the app bar; `inline` — a rounded inset card for content flow
// (exported for future surfaces; only pinned is mounted by
// LifecycleNudgesGate today). The Update card CTA is portal-bound — the
// gate owns the Stripe portal navigation and pending state.

import { useEffect, useState } from 'react'
import { LIFECYCLE_NUDGES_COPY } from './definitions/copy'
import { PAST_DUE_BANNER_Z_INDEX } from './definitions/constants'

const BANNER_COPY = LIFECYCLE_NUDGES_COPY.pastDueBanner

interface PastDueBannerProps {
  variant: 'pinned' | 'inline'
  onDismiss: () => void
  onUpdateCard: () => void
  updateCardPending?: boolean
}

export const PastDueBanner = ({
  variant,
  onDismiss,
  onUpdateCard,
  updateCardPending = false,
}: PastDueBannerProps) => {
  const inline = variant === 'inline'

  // Lazy init from matchMedia so desktop doesn't flash mobile spacing on
  // first paint. Safe: the gate mounts this only after a client-side
  // fetch, so there is no SSR markup to mismatch.
  const [wide, setWide] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 640px)').matches,
  )
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)')
    setWide(mql.matches)
    const listener = (ev: MediaQueryListEvent) => setWide(ev.matches)
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [])

  const strip = (
    <div
      data-testid="past-due-banner"
      role="region"
      aria-label={BANNER_COPY.regionAria}
      aria-live="polite"
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
          ? 'color-mix(in oklch, var(--warning) 12%, var(--surface-1))'
          : 'color-mix(in oklch, var(--warning) 18%, var(--bg-elevated))',
        border: inline
          ? '1px solid color-mix(in oklch, var(--warning) 36%, var(--border))'
          : 'none',
        borderBottom: inline
          ? '1px solid color-mix(in oklch, var(--warning) 36%, var(--border))'
          : '1px solid color-mix(in oklch, var(--warning) 34%, var(--border-strong))',
        color: 'var(--fg)',
      }}
    >
      {/* card-alert */}
      <svg
        width={wide ? 18 : 16}
        height={wide ? 18 : 16}
        viewBox="0 0 16 16"
        aria-hidden
        style={{ flexShrink: 0, color: 'var(--warning)' }}
      >
        <rect
          x="1.5"
          y="3.5"
          width="13"
          height="9"
          rx="1.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path d="M1.5 6 H14.5" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M11.4 8.4 V10.2 M11.4 11.6 v0.2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
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
          {BANNER_COPY.headline}
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
        onClick={onUpdateCard}
        disabled={updateCardPending}
        style={{
          cursor: updateCardPending ? 'default' : 'pointer',
          flexShrink: 0,
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: wide ? '7px 14px' : '6px 12px',
          borderRadius: 8,
          background: 'var(--signal)',
          color: 'var(--fg-on-accent)',
          fontWeight: 800,
          fontSize: wide ? 12.5 : 12,
          letterSpacing: '-0.005em',
        }}
      >
        <span style={{ whiteSpace: 'nowrap' }}>{BANNER_COPY.cta}</span>
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
          <path
            d="M3 9 L9 3 M4.5 3 H9 V7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
          zIndex: PAST_DUE_BANNER_Z_INDEX,
        }}
      >
        {strip}
      </div>
    )
  }
  return strip
}
