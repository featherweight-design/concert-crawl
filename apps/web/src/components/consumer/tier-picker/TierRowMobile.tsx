'use client'

// Mobile accordion row — collapsed summary (name / tagline / price) with
// tap-to-expand detail. One row open at a time; the parent owns which.
// Translated from the handoff's TierRowMobile.

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

interface TierRowMobileProps {
  tier: TierDefinition
  state: PickerState
  founderWindowState: FounderWindowState
  scarcityRail: ScarcityRailData | null
  expanded: boolean
  onToggle: () => void
  onSelect: (tierKey: TierKey, cta: TierCta) => void
}

export const TierRowMobile = ({
  tier,
  state,
  founderWindowState,
  scarcityRail,
  expanded,
  onToggle,
  onSelect,
}: TierRowMobileProps) => {
  const shell = tierShell(tier.key)
  const isCurrent = state === tier.key
  const neutral = isNeutralAccent(shell)
  const stamp = stampColor(shell)
  const recommended =
    tier.key === 'premium' && !isCurrent && state !== 'founder'
  const cta = resolveTierCta(tier.key, state, founderWindowState)

  return (
    <div
      data-testid={`tier-row-${tier.key}`}
      style={{
        position: 'relative',
        background: shell.background,
        border: isCurrent || expanded ? `2px solid ${stamp}` : shell.border,
        borderRadius: 14,
        overflow: 'hidden',
        color: 'var(--fg)',
      }}
    >
      {!neutral && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: shell.accent,
          }}
        />
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`tier-row-detail-${tier.key}`}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          boxSizing: 'border-box',
          padding: '13px 14px',
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
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
                fontSize: 19,
                letterSpacing: '-0.02em',
              }}
            >
              {tier.name}
            </span>
            <TierBadge tier={tier.key} size="sm" />
            {isCurrent && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  fontSize: 8.5,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: neutral ? 'var(--fg-muted)' : shell.accent,
                }}
              >
                {TIER_PICKER_COPY.card.yourPlanInline}
              </span>
            )}
            {recommended && (
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: 4,
                  background:
                    'color-mix(in oklch, var(--signal) 14%, transparent)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  fontSize: 8.5,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--signal)',
                }}
              >
                {TIER_PICKER_COPY.card.popular}
              </span>
            )}
          </div>
          <div
            style={{
              fontWeight: 600,
              fontSize: 12.5,
              color: 'var(--fg-muted)',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {tier.tagline}
          </div>
        </div>
        <div
          style={{
            textAlign: 'right',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 1,
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: 21,
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
              fontSize: 8,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {tier.priceUnit}
          </div>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          aria-hidden
          style={{
            flexShrink: 0,
            color: 'var(--fg-subtle)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform .18s',
          }}
        >
          <path
            d="M3 5 L7 9 L11 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {expanded && (
        <div
          id={`tier-row-detail-${tier.key}`}
          role="region"
          aria-label={TIER_PICKER_COPY.aria.tierDetails(tier.name)}
          style={{
            padding: '0 14px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 11,
          }}
        >
          {tier.key === 'founder' && scarcityRail !== null && (
            <ScarcityRail rail={scarcityRail} />
          )}
          <TierRationale tier={tier} />
          <TierFeatureList tier={tier} gap={6} />
          {tier.badgeOnlyNote !== undefined && (
            <TierMonoNote text={tier.badgeOnlyNote} />
          )}
          {tier.pricePromise !== undefined && (
            <TierMonoNote text={tier.pricePromise} />
          )}
          <TierCtaButton tierKey={tier.key} cta={cta} onSelect={onSelect} />
        </div>
      )}
    </div>
  )
}
