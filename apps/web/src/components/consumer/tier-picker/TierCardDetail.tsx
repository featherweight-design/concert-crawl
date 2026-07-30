// Shared card internals — rationale rail, feature list, mono note,
// price-promise line. Used by both the desktop card and the expanded
// mobile row so the two surfaces can never drift.

import { tierShell } from './lib/tier-shell'
import type { TierDefinition } from './definitions/types'

export const TierRationale = ({ tier }: { tier: TierDefinition }) => {
  const shell = tierShell(tier.key)
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--fg-subtle)',
        letterSpacing: '0.04em',
        lineHeight: 1.5,
        paddingLeft: 9,
        borderLeft: `2px solid ${shell.accent}`,
        opacity: 0.85,
      }}
    >
      {tier.rationale}
    </div>
  )
}

export const TierFeatureList = ({
  tier,
  gap = 5,
}: {
  tier: TierDefinition
  /** Design: 5 on the desktop card, 6 in the expanded mobile row. */
  gap?: number
}) => {
  const shell = tierShell(tier.key)
  return (
    <ul
      style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap,
      }}
    >
      {tier.features.map((feature) => (
        <li
          key={feature.text}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            fontWeight: 500,
            fontSize: 13,
            color: 'var(--fg)',
            letterSpacing: '-0.005em',
            opacity: feature.future ? 0.65 : 1,
          }}
        >
          {feature.future ? (
            <span
              aria-hidden
              style={{
                width: 12,
                flexShrink: 0,
                marginTop: 1,
                color: shell.accent,
                fontSize: 12,
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              ★
            </span>
          ) : (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              style={{ flexShrink: 0, marginTop: 4 }}
              aria-hidden
            >
              <path
                d="M2 6 L5 9 L10 3"
                fill="none"
                stroke={shell.accent}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          <span>{feature.text}</span>
        </li>
      ))}
    </ul>
  )
}

export const TierMonoNote = ({ text }: { text: string }) => (
  <div
    style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 9.5,
      color: 'var(--fg-subtle)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    }}
  >
    {text}
  </div>
)
