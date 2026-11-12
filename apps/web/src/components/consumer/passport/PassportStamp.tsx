import React from 'react';
import { IdentityArtPrint } from '@/components/consumer/identity-art/IdentityArtPrint';
import type { PassportModeConfig } from '@/components/consumer/passport/definitions/modes';
import { venueGlyphKey } from '@/components/consumer/venue-glyph';
import { GlyphShapes } from '@/components/consumer/venue-glyph/VenueGlyph';
import type { AttendedShow } from '@/lib/passport/stats';
import { stampColorsFor, stampDateParts } from '@/lib/passport/stamp';

// The stamp face is the shared round stamp (B+ addendum 3 rule 4, and its
// answer to question 25: "the PNG share card too"), drawn in the board's own
// 58-unit box (`addendum-3/04/one-stamp-m`) and scaled into the tile, so the
// rings keep the board's proportions at 1080 and at 2x print. Only the face
// changed: the tile, its slot, its frame and the date and artist around the
// face are the card's own.
//
// It is drawn here rather than through `VenueStamp` because this card renders
// inside satori: no CSS `filter`, no nested `<svg>`, and `IdentityArtPrint`
// rather than `IdentityArt` for a venue with no glyph. The geometry and the
// colours are the same.
export const SHARE_STAMP_VIEWBOX = 58;
const CENTRE = SHARE_STAMP_VIEWBOX / 2;
export const SHARE_STAMP_OUTER: Readonly<{ radius: number; stroke: number }> = {
  radius: 27.5,
  stroke: 2,
};
export const SHARE_STAMP_INNER: Readonly<{
  radius: number;
  stroke: number;
  dash: string;
}> = { radius: 23, stroke: 0.9, dash: '2.5 2.5' };
/** The glyph's 24-unit grid at 40% of the stamp, centred. */
const GLYPH_BOX = SHARE_STAMP_VIEWBOX * 0.4;
const GLYPH_OFFSET = (SHARE_STAMP_VIEWBOX - GLYPH_BOX) / 2;
export const SHARE_STAMP_GLYPH_STROKE = 1.8;
/** The boards' `drop-shadow(0 0 5px <ring> @ 30%)`; a CSS blur radius is twice the deviation. */
const GLOW_DEVIATION = 2.5;
const GLOW_OPACITY = 0.3;
/** The round stamp's diameter as a share of the tile's shorter side. */
export const SHARE_STAMP_SHARE = 0.6;
/**
 * The tile's ground where the artist art used to be: the same ink as the
 * label scrim, so the white date and artist read on every theme as they did
 * over the art, and the venue colours sit on the dark ground every stamp board
 * draws them on.
 */
export const SHARE_STAMP_GROUND = 'rgb(6,7,15)';

export interface PassportStampProps {
  show: AttendedShow;
  cfg: PassportModeConfig;
  /** Explicit pixel size — satori has no percentage-sized root. */
  width: number;
  height: number;
}

/** The round stamp's diameter inside a tile. */
export const shareStampSize = (width: number, height: number): number =>
  Math.min(width, height) * SHARE_STAMP_SHARE;

/** The venue's round stamp, as `one-stamp-m` draws it, at `size` px. */
const RoundVenueStamp = ({
  show,
  size,
  grain,
}: {
  show: AttendedShow;
  size: number;
  grain: number;
}) => {
  const colors = stampColorsFor(show.venueSlug);
  const glyphKey = venueGlyphKey(show.venueSlug);
  const scale = size / SHARE_STAMP_VIEWBOX;
  const artInset = (CENTRE - SHARE_STAMP_INNER.radius) * scale;
  // Unique per show: every stamp on the wall carries its own glow colour.
  const glowId = `pp-glow-${show.id.replace(/[^A-Za-z0-9_-]/g, '')}`;

  return (
    <div
      data-passport-stamp-face=""
      style={{
        position: 'relative',
        display: 'flex',
        width: size,
        height: size,
      }}
    >
      {glyphKey === null && (
        <div
          data-passport-stamp-fallback=""
          style={{
            position: 'absolute',
            left: artInset,
            top: artInset,
            display: 'flex',
            width: size - artInset * 2,
            height: size - artInset * 2,
            borderRadius: 9999,
            overflow: 'hidden',
          }}
        >
          <IdentityArtPrint
            name={show.venue}
            kind="venue"
            scale="micro"
            grain={grain}
            width={size - artInset * 2}
            height={size - artInset * 2}
          />
        </div>
      )}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${SHARE_STAMP_VIEWBOX} ${SHARE_STAMP_VIEWBOX}`}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <defs>
          <filter id={glowId} x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation={GLOW_DEVIATION}
              floodColor={colors.ring}
              floodOpacity={GLOW_OPACITY}
            />
          </filter>
        </defs>
        <g filter={`url(#${glowId})`}>
          <circle
            data-passport-stamp-ring=""
            cx={CENTRE}
            cy={CENTRE}
            r={SHARE_STAMP_OUTER.radius}
            fill="none"
            stroke={colors.ring}
            strokeWidth={SHARE_STAMP_OUTER.stroke}
          />
          <circle
            data-passport-stamp-inner-ring=""
            cx={CENTRE}
            cy={CENTRE}
            r={SHARE_STAMP_INNER.radius}
            fill="none"
            stroke={colors.ring}
            strokeWidth={SHARE_STAMP_INNER.stroke}
            strokeDasharray={SHARE_STAMP_INNER.dash}
          />
          {glyphKey !== null && (
            <g
              data-passport-stamp-glyph={glyphKey}
              transform={`translate(${GLYPH_OFFSET} ${GLYPH_OFFSET}) scale(${GLYPH_BOX / 24})`}
            >
              <GlyphShapes
                glyphKey={glyphKey}
                paint={colors.glyph}
                strokeWidth={SHARE_STAMP_GLYPH_STROKE}
              />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};

/**
 * One attended show, as a tile whose face is the venue's round stamp.
 *
 * The face is the shared round stamp in the venue's colours (B+ rule 4), so
 * two artists at one venue get the same stamp. The tile is straight: rule 4
 * keeps a tilt only inside the Passport booklet.
 */
export const PassportStamp = ({
  show,
  cfg,
  width,
  height,
}: PassportStampProps) => {
  const punch = stampDateParts(show.date);
  const size = shareStampSize(width, height);

  return (
    <div
      data-passport-stamp={show.id}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width,
        height,
        borderRadius: cfg.stampRadius,
        overflow: 'hidden',
        background: SHARE_STAMP_GROUND,
        // A frame on an image, not screen chrome — a neutral translucent ink
        // reads on every riso paper, where a themed border would not.
        boxShadow: `0 0 0 ${cfg.hairline * 1.5}px rgba(255,255,255,0.14), 0 ${cfg.hairline * 6}px ${cfg.hairline * 16}px ${cfg.hairline * -6}px rgba(0,0,0,0.6)`,
      }}
    >
      <RoundVenueStamp show={show} size={size} grain={cfg.grain} />

      {/* Guarantees the label reads over both light and dark riso papers. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: Math.round(height * 0.62),
          background:
            'linear-gradient(0deg, rgba(6,7,15,0.82) 0%, rgba(6,7,15,0.34) 46%, rgba(6,7,15,0) 100%)',
        }}
      />

      {punch !== null && (
        <div
          style={{
            position: 'absolute',
            left: cfg.stampRadius * 0.55,
            top: cfg.stampRadius * 0.55,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'JetBrains Mono',
            // Only the weights in `loadShareFonts` exist inside satori. Ask for
            // one it does not carry and the PNG silently falls back to another
            // while the browser preview honours the request — the exact
            // preview/print divergence this kit exists to make impossible.
            // JetBrains Mono ships 700 alone.
            fontWeight: 700,
            fontSize: cfg.stampDate,
            lineHeight: 1.05,
            letterSpacing: '0.08em',
            color: '#fff',
          }}
        >
          <span>{punch.month}</span>
          <span>{punch.day}</span>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          left: cfg.stampRadius * 0.6,
          right: cfg.stampRadius * 0.6,
          bottom: cfg.stampRadius * 0.55,
          display: 'flex',
          fontFamily: 'Inter',
          // 900 rather than the prototype's 800 for the same reason as above;
          // it is also the weight the poster gives an artist name.
          fontWeight: 900,
          fontSize: cfg.stampArtist,
          lineHeight: 0.98,
          letterSpacing: '-0.02em',
          color: '#fff',
          // Satori honours neither -webkit-line-clamp nor overflow:hidden on
          // text, so the clamp is a height budget instead: two lines, cut.
          maxHeight: cfg.stampArtist * 2,
          overflow: 'hidden',
        }}
      >
        {show.artist}
      </div>
    </div>
  );
};
