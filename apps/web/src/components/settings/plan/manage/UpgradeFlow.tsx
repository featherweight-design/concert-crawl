'use client'

// #780 Supporter → Premium upgrade confirmation (design table
// lifecycle-flows.md). Signal-toned proration card + 2×2 unlocks grid;
// the primary CTA carries the mono sub line with the prorated charge.
// proratedText is the live proration preview; the design defines no
// loading state, so a quiet placeholder holds the slot while it lands.

import { AMOUNT_PLACEHOLDER, UPGRADE_FLOW_COPY } from './definitions/copy'
import {
  ErrorLine,
  FinePrint,
  FlowButton,
  InfoCard,
  MathRow,
  MonoEyebrow,
  RailHeader,
} from './primitives'

interface UpgradeFlowProps {
  /** Formatted prorated charge, e.g. "$3.25" — null while the preview loads. */
  proratedText: string | null
  /** Desktop modal layout — larger headline/subhead sizes. */
  wide: boolean
  pending: boolean
  errorText: string | null
  onConfirm: () => void
  onBack: () => void
}

export const UpgradeFlow = ({
  proratedText,
  wide,
  pending,
  errorText,
  onConfirm,
  onBack,
}: UpgradeFlowProps) => {
  const copy = UPGRADE_FLOW_COPY
  const prorated = proratedText ?? AMOUNT_PLACEHOLDER

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        color: 'var(--fg)',
      }}
    >
      <RailHeader tone="signal" eyebrow={copy.eyebrow} code={copy.code} />

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

      {/* proration math */}
      <InfoCard tone="signal">
        <MonoEyebrow size={9.5} color="var(--signal)" letterSpacing="0.16em">
          {copy.math.eyebrow}
        </MonoEyebrow>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13.5,
            lineHeight: 1.5,
            color: 'var(--fg)',
          }}
        >
          {copy.math.bodyBefore}
          <strong>{prorated}</strong>
          {copy.math.bodyAfter}
        </div>
        <div
          style={{
            height: 1,
            background: 'color-mix(in oklch, var(--signal) 22%, var(--border))',
          }}
        />
        <MathRow label={copy.math.chargedTodayLabel} value={prorated} strong />
        <MathRow
          label={copy.math.thenMonthlyLabel}
          value={copy.math.thenMonthlyValue}
        />
      </InfoCard>

      {/* unlocks grid */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '0 2px',
        }}
      >
        <MonoEyebrow size={9.5} letterSpacing="0.16em">
          {copy.unlocksLabel}
        </MonoEyebrow>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}
        >
          {copy.unlocks.map((item) => (
            <div
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 500,
                fontSize: 12.5,
                color: 'var(--fg)',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                aria-hidden
                style={{ flexShrink: 0 }}
              >
                <path
                  d="M2 6 L5 9 L10 3"
                  fill="none"
                  stroke="var(--signal)"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {item}
            </div>
          ))}
        </div>
      </div>

      {errorText !== null && <ErrorLine text={errorText} />}

      {/* confirm + back-out */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <FlowButton
          label={copy.confirmCta}
          sub={copy.confirmSub(prorated)}
          kind="primary"
          accent="var(--signal)"
          glow
          disabled={pending}
          onClick={onConfirm}
        />
        <FlowButton
          label={copy.backCta}
          kind="ghost"
          disabled={pending}
          onClick={onBack}
        />
      </div>
      <FinePrint>{copy.finePrint}</FinePrint>
    </div>
  )
}
