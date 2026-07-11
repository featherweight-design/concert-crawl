'use client'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { CheckGlyph, Eyebrow } from '@/components/consumer/glyphs'
import type { Tier, SourceCategory } from '@concert-crawl/types'

const copy = CONSUMER_COPY.priceRegion.addTierSuccess
const AZURE = 'oklch(0.62 0.12 240)'

export interface MTAddTierSuccessProps {
  submittedTier: Tier
  submittedPrice: number
  submittedSourceCategory: SourceCategory
  remainingTiers: ReadonlyArray<Tier>
  // #876 — caller has no contribution acts left for this event today; hide
  // the add-tier pills and show the come-back-tomorrow line instead.
  limitReached?: boolean
  onAddTier: (tier: Tier) => void
  onDone: () => void
}

// Sequential add-another-tier success state. Per §9 Q4-eng lock, the parent
// orchestrator (Task 9) filters `remainingTiers` against client-side session
// state — "tiers I just submitted in this session" — NOT by re-fetching
// priceByTier after success. This component just renders the array it's
// handed; when empty, the add-another section collapses and only Done shows.
export const MTAddTierSuccess = ({
  submittedTier,
  submittedPrice,
  submittedSourceCategory,
  remainingTiers,
  limitReached = false,
  onAddTier,
  onDone,
}: MTAddTierSuccessProps) => (
  <div
    style={{
      width: '100%',
      boxSizing: 'border-box',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-strong)',
      borderRadius: 14,
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}
  >
    <div
      style={{
        padding: '16px 14px',
        borderRadius: 12,
        background: 'color-mix(in oklab, var(--success) 6%, var(--surface-1))',
        border: '1px solid var(--success)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            background: 'var(--success)',
            color: 'var(--fg-on-accent)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckGlyph size={12} color="var(--fg-on-accent)" />
        </span>
        <span
          style={{
            fontFamily: 'Inter, system-ui',
            fontWeight: 800,
            fontSize: 15,
            color: 'var(--fg)',
          }}
        >
          {copy.headline(submittedTier)}
        </span>
      </div>
      <div
        style={{
          fontFamily: 'Inter, system-ui',
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--fg-muted)',
        }}
      >
        {copy.bodyTemplate(
          String(submittedPrice),
          copy.sourceLabels[submittedSourceCategory],
        )}
        <strong style={{ color: AZURE }}>{copy.pendingFragment}</strong>
      </div>
    </div>

    {limitReached && (
      <div
        style={{
          fontFamily: 'Inter, system-ui',
          fontSize: 12,
          color: 'var(--fg-muted)',
          lineHeight: 1.5,
        }}
      >
        {copy.limitReachedLine}
      </div>
    )}

    {!limitReached && remainingTiers.length > 0 && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Eyebrow>{copy.addAnotherEyebrow}</Eyebrow>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {remainingTiers.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => onAddTier(tier)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                boxSizing: 'border-box',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '10px 14px',
                borderRadius: 999,
                border: '1px dashed var(--border-strong)',
                background: 'var(--surface-1)',
                color: 'var(--fg)',
                fontFamily: 'Inter, system-ui',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span style={{ fontWeight: 800, color: 'var(--signal)' }}>+</span>
              {copy.addPillTemplate(tier).replace(/^\+ /, '')}
            </button>
          ))}
        </div>
        <div
          style={{
            fontFamily: 'Inter, system-ui',
            fontSize: 12,
            color: 'var(--fg-muted)',
            lineHeight: 1.5,
          }}
        >
          {copy.helperLine}
        </div>
      </div>
    )}

    <button
      type="button"
      onClick={onDone}
      style={{
        all: 'unset',
        cursor: 'pointer',
        textAlign: 'center',
        height: 44,
        borderRadius: 10,
        border: '1px solid var(--border-strong)',
        color: 'var(--fg)',
        fontFamily: 'Inter, system-ui',
        fontWeight: 700,
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {copy.doneButton}
    </button>
  </div>
)
