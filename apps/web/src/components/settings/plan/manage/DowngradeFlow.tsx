'use client'

// #780 Premium → Supporter downgrade confirmation (design table
// lifecycle-flows.md). Single shape per the design — Premium's "Change plan"
// and Founder's retention path (#780 decision 6) both land here, so the
// "Switch · Premium → Supporter" copy stays hardcoded verbatim.
// creditText is the live proration preview; the design defines no loading
// state, so a quiet placeholder holds the slot while it lands.

import { AMOUNT_PLACEHOLDER, DOWNGRADE_FLOW_COPY } from './definitions/copy'
import { ChangesDisclosure } from './ChangesDisclosure'
import {
  ErrorLine,
  FinePrint,
  FlowButton,
  InfoCard,
  MathRow,
  MonoEyebrow,
  RailHeader,
} from './primitives'

interface DowngradeFlowProps {
  /** Formatted credit, e.g. "$2.50" — null while the preview loads. */
  creditText: string | null
  /** Desktop modal layout — larger headline/subhead sizes. */
  wide: boolean
  pending: boolean
  /** Gates the confirm CTA while the proration preview is still loading. */
  confirmDisabled?: boolean
  errorText: string | null
  onConfirm: () => void
  onBack: () => void
}

export const DowngradeFlow = ({
  creditText,
  wide,
  pending,
  confirmDisabled = false,
  errorText,
  onConfirm,
  onBack,
}: DowngradeFlowProps) => {
  const copy = DOWNGRADE_FLOW_COPY
  const credit = creditText ?? AMOUNT_PLACEHOLDER

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        color: 'var(--fg)',
      }}
    >
      <RailHeader tone="accent" eyebrow={copy.eyebrow} code={copy.code} />

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}
        >
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
      </div>

      {/* proration math */}
      <InfoCard tone="accent">
        <MonoEyebrow size={9.5} color="var(--accent)" letterSpacing="0.16em">
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
          <strong>{credit}</strong>
          {copy.math.bodyAfter}
        </div>
        <div
          style={{
            height: 1,
            background: 'color-mix(in oklch, var(--accent) 22%, var(--border))',
          }}
        />
        <MathRow
          label={copy.math.fromTodayLabel}
          value={copy.math.fromTodayValue}
        />
        <MathRow label={copy.math.creditLabel} value={`+${credit}`} strong />
      </InfoCard>

      <ChangesDisclosure />

      {errorText !== null && <ErrorLine text={errorText} />}

      {/* confirm + back-out */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <FlowButton
          label={copy.confirmCta}
          kind="primary"
          accent="var(--accent)"
          glow
          disabled={pending || confirmDisabled}
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
