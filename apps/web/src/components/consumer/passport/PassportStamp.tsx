import React from 'react'
import { IdentityArtPrint } from '@/components/consumer/identity-art/IdentityArtPrint'
import type { PassportModeConfig } from '@/components/consumer/passport/definitions/modes'
import type { AttendedShow } from '@/lib/passport/stats'
import { passportRotation, stampDateParts } from '@/lib/passport/stamp'

export interface PassportStampProps {
  show: AttendedShow
  cfg: PassportModeConfig
  /** Explicit pixel size — satori has no percentage-sized root. */
  width: number
  height: number
}

/**
 * One attended show, rendered as a mini identity-art tile.
 *
 * The wall IS the identity-art layer: each stamp is a live print tile of that
 * show's artist, drawn by the same generative engine the poster's hero uses, so
 * the two cards read as one system rather than two visual languages.
 */
export const PassportStamp = ({
  show,
  cfg,
  width,
  height,
}: PassportStampProps) => {
  const punch = stampDateParts(show.date)

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width,
        height,
        borderRadius: cfg.stampRadius,
        overflow: 'hidden',
        transform: `rotate(${passportRotation(show.id)}deg)`,
        // A frame on an image, not screen chrome — a neutral translucent ink
        // reads on every riso paper, where a themed border would not.
        boxShadow: `0 0 0 ${cfg.hairline * 1.5}px rgba(255,255,255,0.14), 0 ${cfg.hairline * 6}px ${cfg.hairline * 16}px ${cfg.hairline * -6}px rgba(0,0,0,0.6)`,
      }}
    >
      <IdentityArtPrint
        name={show.artist}
        kind="artist"
        scale="micro"
        showInitials={false}
        grain={cfg.grain}
        width={width}
        height={height}
        style={{ position: 'absolute', left: 0, top: 0 }}
      />

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
  )
}
