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

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}
    >
      <IdentityArt
        name={name}
        kind="venue"
        scale="tile"
        showInitials={false}
        grain={0.08}
        width={size}
        height={size}
      />
      {/* Monogram chip — bottom-left, same convention as the detail page hero */}
      <div
        style={{
          position: 'absolute',
          left: 6,
          bottom: 6,
          padding: '2px 6px',
          borderRadius: 5,
          background: dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(4px)',
          fontFamily: 'var(--font-sans)',
          fontWeight: 900,
          fontSize: size <= 56 ? 9 : 10,
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
