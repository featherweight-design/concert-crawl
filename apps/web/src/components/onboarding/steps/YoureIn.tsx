import { Eyebrow, StepHeading } from './_primitives'
import { ONBOARDING_COPY } from '../definitions/copy'

const copy = ONBOARDING_COPY.youreIn

export function YoureIn() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Eyebrow tone="accent">{copy.eyebrow}</Eyebrow>
      <StepHeading>
        {copy.heading}
        <br />
        <span style={{ color: 'var(--accent)' }}>{copy.headingAccent}</span>
      </StepHeading>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          paddingTop: 16,
          borderTop: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--accent)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          {copy.personalAskLabel}
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: 'Inter, system-ui',
            fontSize: 14.5,
            lineHeight: 1.55,
            color: 'var(--fg)',
            letterSpacing: '-0.005em',
          }}
        >
          {copy.personalAskBody}
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingTop: 2,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              background: 'var(--accent)',
              color: 'var(--fg-on-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Inter, system-ui',
              fontWeight: 900,
              fontSize: 10,
              letterSpacing: '-0.01em',
            }}
          >
            H
          </div>
          <div
            style={{
              fontFamily: "var(--font-handwriting), 'Caveat', system-ui",
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--fg-muted)',
              lineHeight: 1,
            }}
          >
            — Hugh
          </div>
        </div>
      </div>
    </div>
  )
}
