'use client'

// #780 cancel confirmation surface (design table lifecycle-flows.md).
// Tier-gated shape (README decision #6): Premium/Founder get the full flow
// with the 90-day data-safety note and the price-led Switch-to-Supporter
// retention nudge; Supporter gets the thin flow (no cheaper paid tier to
// step down to, so no nudge) with its own body copy naming the unlocks it
// loses — since the 2026-07-29 amendment Supporter carries concert history
// and calendar export, not just the badge. CTA hierarchy (decision #7): "Cancel subscription" is the honest
// primary confirm (danger accent, no glow); "Never mind" is the ghost
// back-out. Retention lives in the nudge card, never in button burying.

import { TierBadge } from '@/components/consumer/tier-picker'
import { TIER_DEFINITIONS } from '@/components/consumer/tier-picker/definitions/constants'
import { CANCEL_FLOW_COPY } from './definitions/copy'
import type { PaidTier } from './definitions/types'
import {
  ErrorLine,
  FinePrint,
  FlowButton,
  InfoCard,
  MathRow,
  MonoEyebrow,
  RailHeader,
} from './primitives'

interface CancelFlowProps {
  tier: PaidTier
  periodEnd: string | null
  /** Desktop modal layout — larger headline/subhead sizes. */
  wide: boolean
  pending: boolean
  errorText: string | null
  onConfirm: () => void
  onSwitchToSupporter: () => void
  onKeep: () => void
}

export const CancelFlow = ({
  tier,
  periodEnd,
  wide,
  pending,
  errorText,
  onConfirm,
  onSwitchToSupporter,
  onKeep,
}: CancelFlowProps) => {
  const copy = CANCEL_FLOW_COPY
  const tierDef = TIER_DEFINITIONS[tier]
  const isPremiumUp = tier === 'premium' || tier === 'founder'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        color: 'var(--fg)',
      }}
    >
      <RailHeader
        tone="muted"
        eyebrow={copy.eyebrow(tierDef.name)}
        code={(periodEnd ?? copy.periodEndFallback).toUpperCase()}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <h2
          style={{
            fontWeight: 900,
            fontSize: wide ? 28 : 24,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          {copy.headline}
        </h2>
        <div
          style={{
            fontWeight: 500,
            fontSize: wide ? 14.5 : 13.5,
            color: 'var(--fg-muted)',
            letterSpacing: '-0.005em',
            lineHeight: 1.5,
          }}
        >
          {copy.subhead}
        </div>
      </div>

      {/* date breakdown */}
      <InfoCard tone="neutral">
        <MathRow
          label={copy.keepUntilLabel(tierDef.name)}
          value={periodEnd ?? copy.periodEndFallback}
          strong
        />
        <div style={{ height: 1, background: 'var(--border)' }} />
        <div
          style={{
            fontWeight: 500,
            fontSize: 12.5,
            color: 'var(--fg-muted)',
            lineHeight: 1.5,
          }}
        >
          {isPremiumUp
            ? copy.bodyPremiumUp(periodEnd)
            : copy.bodySupporter(periodEnd)}
        </div>
      </InfoCard>

      {/* retention nudge — Premium/Founder only */}
      {isPremiumUp && (
        <div
          style={{
            padding: '14px 14px',
            borderRadius: 12,
            background:
              'color-mix(in oklch, var(--accent) 7%, var(--surface-1))',
            border:
              '1px solid color-mix(in oklch, var(--accent) 32%, var(--border))',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MonoEyebrow
              size={9.5}
              color="var(--accent)"
              letterSpacing="0.16em"
            >
              {copy.retention.eyebrow}
            </MonoEyebrow>
            <TierBadge tier="supporter" size="sm" />
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: wide ? 16.5 : 15,
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
            }}
          >
            {copy.retention.headline(tierDef.priceText)}
          </div>
          <div
            style={{
              fontWeight: 500,
              fontSize: 12.5,
              color: 'var(--fg-muted)',
              letterSpacing: '-0.005em',
              lineHeight: 1.5,
            }}
          >
            {copy.retention.body}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={onSwitchToSupporter}
            style={{
              all: 'unset',
              outline: 'revert',
              cursor: pending ? 'default' : 'pointer',
              boxSizing: 'border-box',
              width: '100%',
              textAlign: 'center',
              padding: '11px 14px',
              borderRadius: 10,
              marginTop: 2,
              background: 'transparent',
              color: 'var(--accent)',
              border:
                '1px solid color-mix(in oklch, var(--accent) 50%, var(--border-strong))',
              fontWeight: 800,
              fontSize: 13.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: pending ? 0.6 : 1,
            }}
          >
            {copy.retention.switchCta}
            <svg width="13" height="13" viewBox="0 0 12 12" aria-hidden>
              <path
                d="M4.5 2 L8.5 6 L4.5 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      {errorText !== null && <ErrorLine text={errorText} />}

      {/* confirm + back-out */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <FlowButton
          label={copy.confirmCta}
          kind="primary"
          accent="var(--danger)"
          disabled={pending}
          onClick={onConfirm}
        />
        <FlowButton
          label={copy.keepCta(tierDef.name)}
          kind="ghost"
          disabled={pending}
          onClick={onKeep}
        />
      </div>
      <FinePrint>{copy.finePrint(periodEnd)}</FinePrint>
    </div>
  )
}
