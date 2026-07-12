'use client'

// Payment failure surfaces (PR 4.4) — the five decline-category layouts
// from docs/superpowers/design-tables/failure-surfaces.md. Exported as
// composable pieces (intro / notes / actions) rather than one wrapper:
// the Stripe PaymentElement must keep a stable tree position inside
// CheckoutForm across checkout ↔ failure layouts, so the failure chrome
// renders as conditional siblings around it, never as a new parent.
//
// Voice rules (locked): the word "fraud" never appears; --danger carries
// the message only, the forward action stays --signal; raw decline codes
// are never rendered.

import { useEffect, useRef } from 'react'
import type { DeclineCategory } from '@concert-crawl/types'
import { TIER_PICKER_COPY } from './definitions/copy'
import {
  FAILURE_SURFACE_BEHAVIOR,
  TIER_DEFINITIONS,
} from './definitions/constants'
import type { TierKey } from './definitions/types'

const FAILURE_COPY = TIER_PICKER_COPY.failure

export const failureHeadlineId = (category: DeclineCategory) =>
  `fail-h-${category}`
export const failureBodyId = (category: DeclineCategory) => `fail-d-${category}`

/**
 * Aria attributes for the stable wrapper that hosts the failure layout —
 * an alertdialog (error interrupt), unlike the challenge's plain dialog.
 */
export const failureDialogProps = (category: DeclineCategory) => ({
  role: 'alertdialog',
  'aria-modal': true,
  'aria-labelledby': failureHeadlineId(category),
  'aria-describedby': failureBodyId(category),
})

const monoEyebrowStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
} as const

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M3 3 L13 13 M13 3 L3 13"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
)

const InfoIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 14 14"
    aria-hidden="true"
    style={{ flexShrink: 0, marginTop: 1, color: 'var(--fg-subtle)' }}
  >
    <circle
      cx="7"
      cy="7"
      r="5.6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <path
      d="M7 4.2 v0.2 M7 6.4 v3.4"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
)

/** Tier name + price row — shared by failure and challenge layouts. */
export const TierSummaryLine = ({
  tierKey,
}: {
  tierKey: Exclude<TierKey, 'free'>
}) => {
  const tier = TIER_DEFINITIONS[tierKey]
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span
        style={{
          fontWeight: 900,
          fontSize: 22,
          letterSpacing: '-0.02em',
          color: 'var(--fg)',
        }}
      >
        {tier.name}
      </span>
      <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--fg-muted)' }}>
        {tier.priceText}
        <span style={{ fontSize: 11, fontWeight: 600 }}> {tier.priceUnit}</span>
      </span>
    </div>
  )
}

/**
 * Close-X row + the danger status block (eyebrow / headline / body /
 * conditional note). Rendered ABOVE the payment element slot.
 */
export const FailureSurfaceIntro = ({
  category,
  onDismiss,
}: {
  category: DeclineCategory
  onDismiss: () => void
}) => {
  const config = FAILURE_COPY.categories[category]
  const behavior = FAILURE_SURFACE_BEHAVIOR[category]
  const note = 'note' in config ? config.note : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          aria-label={FAILURE_COPY.closeLabel}
          onClick={onDismiss}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: 8,
            borderRadius: 8,
            color: 'var(--fg-muted)',
          }}
        >
          <CloseIcon />
        </button>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 11,
          padding: '15px 15px 16px',
          borderRadius: 13,
          background: 'color-mix(in oklch, var(--danger) 9%, var(--surface-1))',
          border:
            '1px solid color-mix(in oklch, var(--danger) 34%, var(--border))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: 6,
              background: 'var(--danger)',
              boxShadow: '0 0 8px var(--danger)',
              flexShrink: 0,
            }}
          />
          <span style={{ ...monoEyebrowStyle, color: 'var(--danger)' }}>
            {config.eyebrow}
          </span>
        </div>
        <div
          id={failureHeadlineId(category)}
          aria-live="assertive"
          style={{
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: 'var(--fg)',
            textWrap: 'balance',
          }}
        >
          {config.headline}
        </div>
        <div
          id={failureBodyId(category)}
          style={{
            fontWeight: 500,
            fontSize: 13,
            color: 'var(--fg-muted)',
            lineHeight: 1.5,
          }}
        >
          {config.body}
        </div>
        {note !== null && (
          <div
            aria-live={behavior.noteTone === 'polite' ? 'polite' : undefined}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 7,
              paddingTop: 3,
              fontWeight: 600,
              fontSize: 12,
              color: 'var(--fg-subtle)',
              lineHeight: 1.45,
            }}
          >
            <InfoIcon />
            <span>{note}</span>
          </div>
        )}
      </div>
    </div>
  )
}

/** network_timeout only — the element is hidden, the entered card kept. */
export const FailureCardKeptNote = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: '11px 13px',
      borderRadius: 11,
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
    }}
  >
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      aria-hidden="true"
      style={{ color: 'var(--fg-muted)', flexShrink: 0 }}
    >
      <rect
        x="2"
        y="5"
        width="12"
        height="8"
        rx="1.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path d="M2 7.5 H14" stroke="currentColor" strokeWidth="1.3" />
    </svg>
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--fg-muted)',
      }}
    >
      {FAILURE_COPY.cardKeptNote}
    </span>
  </div>
)

const RetryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M13.5 8 a5.5 5.5 0 1 1 -1.6 -3.9 M13.6 2.2 V4.6 H11.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * Primary / conditional secondary CTAs. Focus moves to the primary
 * action on mount (a11y table — production behavior). The design's
 * tertiary "Save it for later · email me a link" is deliberately not
 * shipped — no email-link backend exists yet (follow-up issue).
 */
export const FailureActions = ({
  category,
  disabled,
  onPrimary,
  onSecondary,
}: {
  category: DeclineCategory
  disabled: boolean
  onPrimary: () => void
  onSecondary: () => void
}) => {
  const config = FAILURE_COPY.categories[category]
  const behavior = FAILURE_SURFACE_BEHAVIOR[category]
  const primaryRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    primaryRef.current?.focus()
  }, [category])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        ref={primaryRef}
        type="button"
        disabled={disabled}
        onClick={onPrimary}
        style={{
          all: 'unset',
          cursor: disabled ? 'default' : 'pointer',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
          width: '100%',
          textAlign: 'center',
          padding: '14px 16px',
          borderRadius: 12,
          background: 'var(--signal)',
          color: 'var(--fg-on-accent)',
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: '-0.005em',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <RetryIcon />
        {config.primary}
      </button>
      {behavior.hasSecondary && (
        <button
          type="button"
          disabled={disabled}
          onClick={onSecondary}
          style={{
            all: 'unset',
            cursor: disabled ? 'default' : 'pointer',
            boxSizing: 'border-box',
            width: '100%',
            textAlign: 'center',
            padding: '11px 16px',
            borderRadius: 12,
            border: '1px solid var(--border-strong)',
            color: 'var(--fg-muted)',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '-0.005em',
          }}
        >
          {FAILURE_COPY.secondary}
        </button>
      )}
    </div>
  )
}
