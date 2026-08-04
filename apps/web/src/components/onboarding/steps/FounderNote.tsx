import { Eyebrow, StepHeading } from './_primitives'
import { ONBOARDING_COPY } from '../definitions/copy'

const copy = ONBOARDING_COPY.founderNote

export function FounderNote() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <StepHeading>{copy.heading}</StepHeading>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          fontFamily: 'Inter, system-ui',
          fontSize: 15.5,
          lineHeight: 1.6,
          color: 'var(--fg)',
          letterSpacing: '-0.005em',
        }}
      >
        <p style={{ margin: 0 }}>{copy.p1}</p>
        <p style={{ margin: 0 }}>{copy.p2}</p>
        <p style={{ margin: 0, color: 'var(--fg-muted)' }}>{copy.p3}</p>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          paddingTop: 4,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            background: 'var(--accent)',
            color: 'var(--fg-on-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, system-ui',
            fontWeight: 900,
            fontSize: 13,
          }}
          aria-hidden
        >
          {ONBOARDING_COPY.founderMonogram}
        </div>
        <div
          style={{
            fontFamily: "var(--font-handwriting), 'Caveat', system-ui",
            fontSize: 24,
            fontWeight: 600,
            color: 'var(--fg)',
            lineHeight: 1,
          }}
        >
          {ONBOARDING_COPY.signature}
        </div>
      </div>
    </div>
  )
}
