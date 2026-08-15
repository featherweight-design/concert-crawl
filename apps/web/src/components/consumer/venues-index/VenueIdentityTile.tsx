import {
  IdentityArt,
  ia_getInitials,
  ia_isDark,
  identityFor,
} from '../identity-art/IdentityArt'

interface VenueIdentityTileProps {
  name: string
  size?: number
}

export function VenueIdentityTile({ name, size = 72 }: VenueIdentityTileProps) {
  const identity = identityFor(name, 'venue')
  const dark = ia_isDark(identity.palette.bg)
  const initials = ia_getInitials(name, 2)

  const small = size <= 56
  const chipOffset = small ? 4 : 6
  const chipPaddingH = small ? 5 : 6
  const chipBorderRadius = small ? 4 : 5
  const tileRadius = small ? 9 : 10

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: tileRadius,
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}
    >
      <IdentityArt
        name={name}
        kind="venue"
        scale="tile"
        grain={0.08}
        width={size}
        height={size}
      />
      {/* Monogram chip, drawn here rather than by IdentityArt: #1525 retired
          the chip internal to IdentityArt. Venue surfaces keep their own
          overlay — venue imagery is governed by a separate handoff. */}
      <div
        style={{
          position: 'absolute',
          left: chipOffset,
          bottom: chipOffset,
          padding: `2px ${chipPaddingH}px`,
          borderRadius: chipBorderRadius,
          background: dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(4px)',
          fontFamily: 'var(--font-sans)',
          fontWeight: 900,
          fontSize: small ? 9 : 10,
          letterSpacing: '0.04em',
          color: dark ? '#F1E6D5' : '#191418',
          lineHeight: 1,
        }}
      >
        {initials}
      </div>
    </div>
  )
}
