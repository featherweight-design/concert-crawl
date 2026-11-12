// 16px stroke glyph set for the notification panel (#737), ported verbatim
// from design_handoff_in_app_notifications/notifications-data.jsx (GLYPH).
//
// All marks are 16-viewBox, fill="none", stroked in currentColor so the tile
// supplies the category ink. No filled icons, no brand marks — newshow's glyph
// is a signal arc, never the Spotify logo. Sold out and both price check
// categories draw the plain `tag` (B19a boards).

import type { JSX } from 'react';

export type GlyphName =
  | 'pricedrop'
  | 'cancelled'
  | 'postponed'
  | 'backonsale'
  | 'newshow'
  | 'userfixed'
  | 'crew'
  | 'tag'
  | 'bell';

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
  newshow: (
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
  // A person with a cross: the wrong match was taken off. The same idea as the
  // UserX mark the wrong-artist report card is drawn with in its handoff.
  userfixed: (
    <>
      <circle cx="6" cy="5.2" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M1.8 13.5c0-2.4 1.9-4 4.2-4s4.2 1.6 4.2 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11.6 4.4l3 3m0-3l-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  // Two figures, not a crowd: a crew is small by construction (the cap is 12),
  // and three heads at 16px is mud. Stroked like the rest — no filled avatar.
  crew: (
    <>
      <circle cx="6" cy="5.6" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M1.8 13.2c0-2.2 1.9-3.6 4.2-3.6s4.2 1.4 4.2 3.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M11.1 3.6a2.2 2.2 0 010 4.2M11.6 9.9c1.6.35 2.6 1.5 2.6 3.3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </>
  ),
  // The plain price tag the B19a boards draw for sold out and both price check
  // rows (`notif-shows-m`, `notif-prices-m`).
  tag: (
    <>
      <path
        d="M2 2h5.2L14 8.8 8.8 14 2 7.2V2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="5" cy="5" r="1.1" fill="currentColor" />
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
};

export const NotifGlyph = ({
  name,
  size = 16,
}: {
  name: GlyphName;
  size?: number;
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
);
