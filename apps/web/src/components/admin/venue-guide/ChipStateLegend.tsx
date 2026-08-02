import type { GuideChipState } from '@concert-crawl/types'
import { MonoLabel } from '../primitives'
import { ADMIN_COPY } from '../definitions/copy'
import { ChipStateDot } from './ChipStateDot'

const GUIDE_COPY = ADMIN_COPY.venueDetailsClient.guide

const ROWS: Array<{ state: GuideChipState; body: string }> = [
  { state: 'blank', body: GUIDE_COPY.legend.blankBody },
  { state: 'authored', body: GUIDE_COPY.legend.authoredBody },
  { state: 'honest_placeholder', body: GUIDE_COPY.legend.placeholderBody },
]

export const ChipStateLegend = () => (
  <div
    style={{
      padding: 18,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      fontFamily: 'var(--font-sans)',
    }}
  >
    <MonoLabel>{GUIDE_COPY.legend.heading}</MonoLabel>
    <dl style={{ margin: 0, marginTop: 12 }}>
      {ROWS.map((row, index) => (
        <div
          key={row.state}
          style={{
            display: 'flex',
            gap: 12,
            padding: '12px 0',
            borderTop: index > 0 ? '1px solid var(--border)' : 'none',
          }}
        >
          <div
            style={{
              width: 20,
              display: 'flex',
              justifyContent: 'center',
              paddingTop: 3,
              flexShrink: 0,
            }}
          >
            <ChipStateDot state={row.state} size={9} hideLabel />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <dt style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
              {GUIDE_COPY.state[row.state]}
            </dt>
            <dd
              style={{
                margin: 0,
                fontSize: 12,
                color: 'var(--fg-muted)',
                lineHeight: 1.5,
                marginTop: 2,
              }}
            >
              {row.body}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  </div>
)
