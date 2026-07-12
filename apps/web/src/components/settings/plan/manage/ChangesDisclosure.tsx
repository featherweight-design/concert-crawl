'use client'

// #780 collapsed "what moves" disclosure, rendered by DowngradeFlow between
// the proration card and the button stack (design table lifecycle-flows.md).
// The chevron rotate is the ONLY transition in the whole lifecycle design.
// Stays/off lists are hard-coded per the #781 §6 matrix + R6 amendment.

import { useState } from 'react'
import { CHANGES_DISCLOSURE_COPY } from './definitions/copy'
import { MonoEyebrow } from './primitives'

const InfoIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 16 16"
    aria-hidden
    style={{ flexShrink: 0, color: 'var(--fg-muted)' }}
  >
    <circle
      cx="8"
      cy="8"
      r="6.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <path
      d="M8 5.2 V8.4 M8 10.6 H8.01"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
)

const StaysCheck = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    aria-hidden
    style={{ flexShrink: 0, marginTop: 3 }}
  >
    <path
      d="M2 6 L5 9 L10 3"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const OffCross = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    aria-hidden
    style={{ flexShrink: 0, marginTop: 3 }}
  >
    <path
      d="M3 3 L9 9 M9 3 L3 9"
      fill="none"
      stroke="var(--fg-subtle)"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
)

export const ChangesDisclosure = () => {
  const [open, setOpen] = useState(false)
  const copy = CHANGES_DISCLOSURE_COPY

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        style={{
          all: 'unset',
          outline: 'revert',
          cursor: 'pointer',
          boxSizing: 'border-box',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
        }}
      >
        <InfoIcon />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontWeight: 600,
            fontSize: 13,
            color: 'var(--fg)',
            letterSpacing: '-0.005em',
          }}
        >
          {copy.summary}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          aria-hidden
          style={{
            flexShrink: 0,
            color: 'var(--fg-subtle)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .18s',
          }}
        >
          <path
            d="M3 5 L7 9 L11 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          style={{
            padding: '2px 14px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 13,
          }}
        >
          <div style={{ height: 1, background: 'var(--border)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <MonoEyebrow size={9} color="var(--accent)" letterSpacing="0.16em">
              {copy.staysLabel}
            </MonoEyebrow>
            {copy.stays.map((item) => (
              <div
                key={item}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
              >
                <StaysCheck />
                <span
                  style={{
                    fontWeight: 500,
                    fontSize: 12.5,
                    color: 'var(--fg)',
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <MonoEyebrow
              size={9}
              color="var(--fg-subtle)"
              letterSpacing="0.16em"
            >
              {copy.offLabel}
            </MonoEyebrow>
            {copy.off.map((item) => (
              <div
                key={item}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
              >
                <OffCross />
                <span
                  style={{
                    fontWeight: 500,
                    fontSize: 12.5,
                    color: 'var(--fg-muted)',
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              fontWeight: 500,
              fontSize: 11.5,
              color: 'var(--fg-subtle)',
              lineHeight: 1.5,
              fontStyle: 'italic',
            }}
          >
            {copy.restoreNote}
          </div>
        </div>
      )}
    </div>
  )
}
