// Founder scarcity rail — medium intensity from monetization-shared.jsx:
// claimed count + countdown over a thin progress bar. "Hot" flips the bar
// and count to accent.

import { TIER_PICKER_COPY } from './definitions/copy'
import { scarcityTimeText } from './lib/scarcity'
import type { ScarcityRailData } from './definitions/types'

const railEyebrowStyle = (color: string): React.CSSProperties => ({
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color,
})

export const ScarcityRail = ({ rail }: { rail: ScarcityRailData }) => {
  const pct = (rail.seatsClaimed / rail.seatsTotal) * 100
  const tone = rail.hot ? 'var(--accent)' : 'var(--signal)'

  return (
    <div
      data-testid="scarcity-rail"
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={railEyebrowStyle(tone)}>
          {TIER_PICKER_COPY.scarcity.claimed(
            rail.seatsClaimed,
            rail.seatsTotal,
          )}
        </span>
        <span style={railEyebrowStyle('var(--fg-muted)')}>
          {scarcityTimeText(rail)}
        </span>
      </div>
      <div
        style={{
          height: 3,
          borderRadius: 3,
          background: 'var(--surface-2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: tone,
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  )
}
