'use client'

// Desktop tier card — translated from the handoff's TierStateCard: tone
// shell, current-plan banner, founder scarcity rail, header, rationale
// rail, feature list, price-promise line, CTA.

import type { FounderWindowState } from '@concert-crawl/types'
import { TIER_PICKER_COPY } from './definitions/copy'
import { resolveTierCta } from './lib/resolve-tier-cta'
import { tierShell, isNeutralAccent, stampColor } from './lib/tier-shell'
import { TierBadge } from './TierBadge'
import { ScarcityRail } from './ScarcityRail'
import { TierCtaButton } from './TierCtaButton'
import { TierRationale, TierFeatureList, TierMonoNote } from './TierCardDetail'
import type {
  PickerState,
  ScarcityRailData,
  TierCta,
  TierDefinition,
  TierKey,
} from './definitions/types'

interface TierCardDesktopProps {
  tier: TierDefinition
  state: PickerState
  founderWindowState: FounderWindowState
  scarcityRail: ScarcityRailData | null
  onSelect: (tierKey: TierKey, cta: TierCta) => void
  autoFocusCta?: boolean
}

export const TierCardDesktop = ({
  tier,
  state,
  founderWindowState,
  scarcityRail,
  onSelect,
  autoFocusCta = false,
}: TierCardDesktopProps) => {
  const shell = tierShell(tier.key)
  const isCurrent = state === tier.key
  const cta = resolveTierCta(tier.key, state, founderWindowState)
  const neutral = isNeutralAccent(shell)
  const stamp = stampColor(shell)

  return (
    <div
      data-testid={`tier-card-${tier.key}`}
      style={{
        position: 'relative',
        background: shell.background,
        border: isCurrent ? `2px solid ${stamp}` : shell.border,
        boxShadow: isCurrent
          ? `inset 0 0 0 1px ${neutral ? 'var(--border)' : `color-mix(in oklch, ${shell.accent} 30%, transparent)`}`
          : shell.shadow,
        borderRadius: 14,
        padding: '14px 14px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        color: 'var(--fg)',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      {isCurrent && (
        <div
          style={{
            margin: '-14px -14px 0',
            padding: '7px 14px',
            background: neutral
              ? 'var(--surface-2)'
              : `color-mix(in oklch, ${shell.accent} 18%, var(--bg-elevated))`,
            borderBottom: `1px solid ${stamp}`,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            fontSize: 9.5,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: neutral ? 'var(--fg)' : shell.accent,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path
              d="M2 5 L4 7 L8 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            {tier.key === 'founder'
              ? TIER_PICKER_COPY.card.yourPlanFounder
              : TIER_PICKER_COPY.card.yourPlan}
          </span>
        </div>
      )}

      {tier.key === 'founder' && scarcityRail !== null && (
        <ScarcityRail rail={scarcityRail} />
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontWeight: 900,
                fontSize: 22,
                letterSpacing: '-0.02em',
                color: 'var(--fg)',
              }}
            >
              {tier.name}
            </span>
            <TierBadge tier={tier.key} size="sm" />
          </div>
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--fg-muted)',
              letterSpacing: '-0.01em',
            }}
          >
            {tier.tagline}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div
            style={{
              fontWeight: 900,
              fontSize: 26,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              color: tier.key === 'free' ? 'var(--fg-muted)' : 'var(--fg)',
            }}
          >
            {tier.priceText}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: 9,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            {tier.priceUnit}
          </div>
        </div>
      </div>

      <TierRationale tier={tier} />
      <TierFeatureList tier={tier} />
      {tier.monoNote !== undefined && <TierMonoNote text={tier.monoNote} />}
      {tier.pricePromise !== undefined && (
        <TierMonoNote text={tier.pricePromise} />
      )}

      <div style={{ marginTop: 'auto' }}>
        <TierCtaButton
          tierKey={tier.key}
          cta={cta}
          onSelect={onSelect}
          autoFocus={autoFocusCta}
        />
      </div>
    </div>
  )
}
