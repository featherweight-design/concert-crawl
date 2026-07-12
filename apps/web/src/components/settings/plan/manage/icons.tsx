// Row icons for the #780 manage sheet — every path `d` is verbatim from
// docs/superpowers/design-tables/lifecycle-manage.md (a design-review agent
// checks these attribute-by-attribute).

import type { ReactNode } from 'react'

export const MANAGE_ICONS: Record<
  'swap' | 'leave' | 'card' | 'receipt' | 'mail' | 'globe',
  ReactNode
> = {
  swap: (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M3 5 H11 M9 3 L11 5 L9 7 M13 11 H5 M7 9 L5 11 L7 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  leave: (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M9 3 H4 V13 H9 M11 5.5 L13.5 8 L11 10.5 M13.5 8 H6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  card: (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <rect
        x="2"
        y="4"
        width="12"
        height="8.5"
        rx="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M2 6.8 H14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  receipt: (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M4 2.5 V13.5 L6 12.5 L8 13.5 L10 12.5 L12 13.5 V2.5 Z M6 6 H10 M6 8.5 H10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  ),
  mail: (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <rect
        x="2"
        y="3.5"
        width="12"
        height="9"
        rx="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M2.6 4.5 L8 8.5 L13.4 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  globe: (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <circle
        cx="8"
        cy="8"
        r="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M2.5 8 H13.5 M8 2.5 C10 5 10 11 8 13.5 C6 11 6 5 8 2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  ),
}

/** Trailing chevron on the in-app manage rows. */
export const RowChevron = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 14 14"
    aria-hidden
    style={{ flexShrink: 0, color: 'var(--fg-subtle)' }}
  >
    <path
      d="M5 3 L9 7 L5 11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
