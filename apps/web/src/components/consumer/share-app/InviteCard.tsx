import React from 'react';

import { BRAND_INK, BRAND_PAPER } from '@/lib/definitions/brand';
import { BRAND_COPY } from '@/components/brand/definitions/copy';
import { SHARE_APP_COPY } from './definitions/copy';

export interface InviteCardProps {
  width: number;
  height: number;
}

// The invite board's own colours. Satori cannot read a custom property.
const EYEBROW = '#ff6fd0'; // fwd-allow-hex: board art colour
const SUB = '#9aa8c7'; // fwd-allow-hex: board art colour
const TITLE = '#e8f3ff'; // fwd-allow-hex: board art colour

/**
 * The card a pasted invite link (`/i/<code>`, which redirects to `/auth/code`)
 * unfurls into: "You're invited", the headline and the one-line reason, over
 * the product's dark field. It names nobody, so it is one image for every code.
 *
 * 🔸 The board also draws a row of venue icon tiles under the sub line. Satori
 * does not draw the glyph SVGs reliably in the edge runtime, so the card ships
 * without them rather than with a hole where they go.
 *
 * Satori-safe by construction: flex boxes, flat fills and the faces
 * `loadShareFonts` provides.
 */
export const InviteCard = ({ width, height }: InviteCardProps) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      width,
      height,
      padding: 90,
      backgroundColor: BRAND_PAPER,
    }}
  >
    <div
      style={{
        display: 'flex',
        fontFamily: 'Inter',
        fontWeight: 900,
        fontSize: 40,
        letterSpacing: '-0.025em',
        lineHeight: 1,
        color: BRAND_INK,
      }}
    >
      {BRAND_COPY.wordmark.lead}
      <span style={{ color: EYEBROW }}>{BRAND_COPY.wordmark.accent}</span>
    </div>
    <div
      style={{
        display: 'flex',
        marginTop: 72,
        fontFamily: 'JetBrains Mono',
        fontWeight: 700,
        fontSize: 20,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: EYEBROW,
      }}
    >
      {SHARE_APP_COPY.ogEyebrow}
    </div>
    <div
      style={{
        display: 'flex',
        marginTop: 20,
        fontFamily: 'Inter',
        fontWeight: 900,
        fontSize: 84,
        letterSpacing: '-0.04em',
        lineHeight: 1.04,
        color: TITLE,
      }}
    >
      {SHARE_APP_COPY.ogTitle}
    </div>
    <div
      style={{
        display: 'flex',
        marginTop: 32,
        fontFamily: 'Inter',
        fontWeight: 400,
        fontSize: 30,
        lineHeight: 1.3,
        color: SUB,
      }}
    >
      {SHARE_APP_COPY.ogSub}
    </div>
  </div>
);
