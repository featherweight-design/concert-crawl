// 16px stroke glyph set for the notification panel (#737), ported verbatim
// from design_handoff_in_app_notifications/notifications-data.jsx (GLYPH).
//
// All marks are 16-viewBox, fill="none", stroked in currentColor so the tile
// supplies the category ink. No filled icons, no brand marks — spotify's glyph
// is a signal arc, not the Spotify logo, and contest.resolved is a balance
// scale rather than a ticket (two numbers were weighed, nobody won a prize).

import type { JSX } from 'react'

export type GlyphName =
  | 'pricedrop'
  | 'cancelled'
  | 'postponed'
  | 'soldout'
  | 'backonsale'
  | 'resolved'
  | 'needsinfo'
  | 'spotify'
  | 'bell'

export const GLYPH: Record<GlyphName, JSX.Element> = {
  pricedrop: (
    <>
      <path
        d="M2.5 7.2V2.5H7.2L13.5 8.8 8.8 13.5 2.5 7.2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="5.4" cy="5.4" r="1" fill="currentColor" />
      <path
        d="M9.4 7.6v3.2m0 0l-1.3-1.3m1.3 1.3l1.3-1.3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  cancelled: (
    <>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.8 5.8l4.4 4.4m0-4.4l-4.4 4.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  postponed: (
    <>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 4.6V8l2.4 1.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  soldout: (
    <>
      <rect
        x="2"
        y="4.6"
        width="12"
        height="7.4"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M2.6 13.4L13.4 3.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  backonsale: (
    <>
      <path
        d="M13.2 8a5.2 5.2 0 11-1.7-3.85"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M13.4 2.2v2.9h-2.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  resolved: (
    <>
      <path
        d="M8 3.4v10.1M5.6 13.5h4.8M3 5.9h10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M3 5.9L1.5 9.1a1.9 1.9 0 003 0L3 5.9zM13 5.9l-1.5 3.2a1.9 1.9 0 003 0L13 5.9z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="3.4" r="1.1" fill="currentColor" />
    </>
  ),
  needsinfo: (
    <>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.4 6.3a1.7 1.7 0 113 1.1c-.6.5-.9.8-.9 1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8.4" cy="11.2" r="0.85" fill="currentColor" />
    </>
  ),
  spotify: (
    <>
      <circle
        cx="4.6"
        cy="11.4"
        r="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8.4 10.2a5.4 5.4 0 00-1.5-3.8M11.1 11.1A8.2 8.2 0 006.9 3.7M13.6 11.8A10.9 10.9 0 006.8 1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  bell: (
    <>
      <path
        d="M4 7a4 4 0 118 0c0 2.6.7 3.7 1.3 4.3a.4.4 0 01-.3.7H3a.4.4 0 01-.3-.7C3.3 10.7 4 9.6 4 7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M6.6 13.6a1.6 1.6 0 002.8 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
}

export const NotifGlyph = ({
  name,
  size = 16,
}: {
  name: GlyphName
  size?: number
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    {GLYPH[name]}
  </svg>
)
