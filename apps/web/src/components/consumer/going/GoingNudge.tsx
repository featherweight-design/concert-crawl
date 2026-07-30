'use client'

// The "Still going?" nudge banner (#70), from
// design_handoff_concert_history/going-cta.jsx:236-306.
//
// Appears beneath a Watching row while the night is still ahead. Tone is
// helpful, not nagging — one line, accent-tinted, no exclamation. The caller
// owns the window check and the per-device memory; this component only draws
// and reports which of the three actions was taken.

import type { CSSProperties } from 'react'
import type { WatchingShow } from '@concert-crawl/types'
import { GOING_COPY } from './definitions/copy'
import { stampAccentFor } from './lib/stamp'
import { daysUntilLabel } from '@/lib/going/nudge-window'

type GoingNudgeProps = {
  show: Pick<WatchingShow, 'artist' | 'date'>
  onYes: () => void
  onDecline: () => void
  onDismiss: () => void
}

const MIN_TAP_TARGET = 44

const CheckIcon = () => (
  <svg
    width={11}
    height={11}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M20 6L9 17l-5-5"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const XIcon = () => (
  <svg
    width={11}
    height={11}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M18 6L6 18M6 6l12 12"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
)

const RESET: CSSProperties = {
  all: 'unset',
  boxSizing: 'border-box',
  cursor: 'pointer',
  flexShrink: 0,
  fontFamily: 'var(--font-ui)',
}

export const GoingNudge = ({
  show,
  onYes,
  onDecline,
  onDismiss,
}: GoingNudgeProps) => {
  const accent = stampAccentFor(show.artist)

  return (
    <div
      // The banner appears passively when a show crosses into the window, so a
      // screen reader would otherwise never learn it exists.
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px 10px 14px',
        background: `color-mix(in oklch, ${accent} 10%, var(--surface-1))`,
        border: `1px solid color-mix(in oklch, ${accent} 40%, var(--border))`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 10,
        color: 'var(--fg)',
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: '-0.005em',
          }}
        >
          {GOING_COPY.nudge.heading}{' '}
          <span style={{ color: 'var(--fg-muted)', fontWeight: 500 }}>
            {daysUntilLabel(show)}
          </span>
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.02em',
          }}
        >
          {GOING_COPY.nudge.support}
        </span>
      </div>

      <button
        type="button"
        className="going-nudge-action"
        onClick={onYes}
        style={{
          ...RESET,
          padding: '7px 11px',
          borderRadius: 7,
          background: accent,
          color: 'var(--bg)',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '-0.005em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <CheckIcon />
        {GOING_COPY.nudge.yes}
      </button>

      <button
        type="button"
        className="going-nudge-action"
        onClick={onDecline}
        style={{
          ...RESET,
          padding: '7px 9px',
          borderRadius: 7,
          color: 'var(--fg-muted)',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {GOING_COPY.nudge.decline}
      </button>

      <button
        type="button"
        className="going-nudge-action"
        onClick={onDismiss}
        aria-label={GOING_COPY.nudge.dismiss}
        style={{
          ...RESET,
          position: 'relative',
          width: 22,
          height: 22,
          borderRadius: 5,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--fg-subtle)',
        }}
      >
        {/* Extends the hit area to 44px without growing the drawn glyph. */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: MIN_TAP_TARGET,
            height: MIN_TAP_TARGET,
          }}
        />
        <XIcon />
      </button>
    </div>
  )
}
