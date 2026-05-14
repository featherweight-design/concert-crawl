import { Eyebrow, Lede, StepHeading } from './_primitives'

export function YoureIn() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Eyebrow tone="accent">You&apos;re in</Eyebrow>
      <StepHeading>
        One last thing.
        <br />
        <span style={{ color: 'var(--accent)' }}>
          You&apos;ll be shaping the app.
        </span>
      </StepHeading>
      <Lede>
        You&apos;re not just here to use the thing — you&apos;re here to make it
        better. When something changes, we&apos;ll ask what you think. When
        something breaks, we want to know.
      </Lede>
      <Lede>
        The Give Feedback button lives in your menu — always there, never
        buried. Tap it and you&apos;ll see a quick category picker and a
        free-form message field. Thirty seconds. I read every one.
      </Lede>
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
          One ask, from me
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
          Most shows won&apos;t have a price listed yet — that&apos;s the part
          you can fix. When you buy a ticket, take ten seconds to report what
          you paid. Two fans confirming a number is all it takes to make a price
          real for everyone else.
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
