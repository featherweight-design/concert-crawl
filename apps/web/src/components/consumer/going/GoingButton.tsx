'use client'

// The "I'm going!" commitment CTA (#70), from
// design_handoff_concert_history/going-cta.jsx:77-182.
//
// The button is shaped like a ticket stub, and on `going` it fills with the
// artist's accent and snaps the glyph into the stub hole — so the button
// visually *becomes* the stamp it will be in History.
//
// `past-yes` / `past-no` are read-only displays, not affordances: the
// retroactive "I went, actually" toggle is out of scope for v1.

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { GOING_COPY } from './definitions/copy'
import { stampAccentFor, stampGlyphFor } from './lib/stamp'

export type GoingButtonState = 'default' | 'going' | 'past-yes' | 'past-no'
export type GoingButtonSize = 'sm' | 'md' | 'lg'

type GoingButtonProps = {
  show: { eventId: string; artist: string; date: string }
  state?: GoingButtonState
  size?: GoingButtonSize
  fullWidth?: boolean
  pending?: boolean
  onChange?: (going: boolean) => void
}

const SIZES: Record<
  GoingButtonSize,
  {
    height: number
    padX: number
    font: number
    gap: number
    hole: number
    radius: number
  }
> = {
  sm: { height: 36, padX: 12, font: 12, gap: 6, hole: 28, radius: 8 },
  md: { height: 44, padX: 16, font: 13.5, gap: 8, hole: 32, radius: 9 },
  lg: { height: 52, padX: 20, font: 15, gap: 10, hole: 38, radius: 10 },
}

const MIN_TAP_TARGET = 44

// A plain YYYY-MM-DD is anchored at noon UTC before formatting — midnight would
// slip to the previous day in any negative-offset zone and label the night the
// user attended one day early.
const formatWentDate = (date: string): string =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Denver',
  }).format(new Date(`${date}T12:00:00Z`))

const CheckIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M20 6L9 17l-5-5"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const GoingButton = ({
  show,
  state = 'default',
  size = 'lg',
  fullWidth = false,
  pending = false,
  onChange,
}: GoingButtonProps) => {
  const sizes = SIZES[size]
  const accent = stampAccentFor(show.artist)
  const glyph = stampGlyphFor(show.artist)

  const isPast = state === 'past-yes' || state === 'past-no'
  const isOn = state === 'going' || state === 'past-yes'
  const isDeclined = state === 'past-no'
  const disabled = isPast || pending

  const [announcement, setAnnouncement] = useState('')
  const previousState = useRef(state)

  // Only a real transition announces — mounting into `going` (a page load for a
  // show you already committed to) is not a state change the user just made.
  useEffect(() => {
    const was = previousState.current
    previousState.current = state
    if (was === state) return
    if (state === 'going') setAnnouncement(GOING_COPY.button.stateChangeGoing)
    else if (was === 'going' && state === 'default') {
      setAnnouncement(GOING_COPY.button.stateChangeReleased)
    }
  }, [state])

  const label =
    state === 'default'
      ? GOING_COPY.button.default
      : state === 'going'
        ? GOING_COPY.button.going
        : state === 'past-yes'
          ? GOING_COPY.button.pastYes(formatWentDate(show.date))
          : GOING_COPY.button.pastNo

  const buttonStyle: CSSProperties = {
    all: 'unset',
    boxSizing: 'border-box',
    position: 'relative',
    cursor: disabled ? 'default' : 'pointer',
    display: fullWidth ? 'flex' : 'inline-flex',
    alignItems: 'stretch',
    width: fullWidth ? '100%' : 'auto',
    maxWidth: '100%',
    height: sizes.height,
    borderRadius: sizes.radius,
    // The forward action reads on --signal; the accent only ever appears once
    // the night is committed. A verb never sits on --danger.
    background: isOn
      ? `color-mix(in oklch, ${accent} 22%, var(--surface-1))`
      : 'var(--surface-1)',
    border: `1.5px solid ${isOn ? accent : 'var(--border-strong)'}`,
    color: isDeclined ? 'var(--fg-subtle)' : 'var(--fg)',
    fontFamily: 'var(--font-ui)',
    fontWeight: 700,
    fontSize: sizes.font,
    letterSpacing: '-0.01em',
    // `pending` blocks a second tap but is deliberately invisible: the caller
    // commits optimistically, so dimming here would undo the point of it.
    opacity: isDeclined ? 0.7 : 1,
    boxShadow: isOn
      ? `0 8px 24px -10px color-mix(in oklch, ${accent} 70%, transparent)`
      : 'none',
    transition:
      'background 160ms, border-color 160ms, color 160ms, opacity 150ms',
  }

  const tapPad = Math.max(0, (MIN_TAP_TARGET - sizes.height) / 2)

  return (
    <>
      <button
        type="button"
        className="going-cta"
        disabled={disabled}
        // The past states are read-only displays, not toggles — announcing
        // aria-pressed=false on `past-yes` would claim the user isn't going to a
        // show they already attended.
        aria-pressed={isPast ? undefined : state === 'going'}
        aria-label={
          state === 'going'
            ? GOING_COPY.button.ariaGoing
            : state === 'default'
              ? GOING_COPY.button.ariaNotGoing
              : undefined
        }
        onClick={() => {
          if (disabled) return
          onChange?.(!isOn)
        }}
        style={buttonStyle}
      >
        {/* Extends the hit area to 44px without shrinking the drawn control.
            An overflowing child still routes its clicks to the button. */}
        {tapPad > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: -tapPad,
              bottom: -tapPad,
            }}
          />
        )}

        <span
          style={{
            width: sizes.height,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            borderRight: `1.5px dashed ${
              isOn
                ? `color-mix(in oklch, ${accent} 75%, transparent)`
                : 'var(--border-strong)'
            }`,
          }}
        >
          {isOn ? (
            <svg
              width={sizes.hole}
              height={sizes.hole}
              viewBox="0 0 24 24"
              style={{ display: 'block' }}
              aria-hidden="true"
              focusable="false"
            >
              {glyph === 'star' && (
                <polygon
                  transform="translate(12 12) scale(0.7) translate(-12 -12)"
                  points="12,2 14.35,8.76 21.51,8.91 15.8,13.24 17.88,20.09 12,16 6.12,20.09 8.2,13.24 2.49,8.91 9.65,8.76"
                  fill={accent}
                />
              )}
              {glyph === 'diamond' && (
                <polygon
                  transform="translate(12 12) scale(0.75) translate(-12 -12)"
                  points="12,2 22,12 12,22 2,12"
                  fill={accent}
                />
              )}
              {glyph === 'ring' && (
                <circle
                  cx="12"
                  cy="12"
                  r="6.6"
                  fill="none"
                  stroke={accent}
                  strokeWidth="2.6"
                />
              )}
              {glyph === 'triangle' && (
                <polygon
                  transform="translate(12 12) scale(0.7) translate(-12 -12)"
                  points="12,3 21,19 3,19"
                  fill={accent}
                />
              )}
            </svg>
          ) : (
            <svg
              width={sizes.hole - 8}
              height={sizes.hole - 8}
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: 'var(--fg-subtle)' }}
              aria-hidden="true"
              focusable="false"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="2 3"
                fill="none"
              />
            </svg>
          )}
        </span>

        <span
          style={{
            padding: `0 ${sizes.padX}px`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: sizes.gap,
            minWidth: 0,
            flex: fullWidth ? 1 : '0 0 auto',
            justifyContent: fullWidth ? 'center' : 'flex-start',
          }}
        >
          {state === 'going' && (
            <CheckIcon size={Math.round(sizes.font * 0.95)} />
          )}
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
        </span>
      </button>

      <span
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        {announcement}
      </span>
    </>
  )
}
