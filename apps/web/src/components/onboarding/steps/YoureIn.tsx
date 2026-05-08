import { Eyebrow, StepHeading, Lede } from './_primitives'

export function YoureIn() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Eyebrow tone="accent">You&apos;re in</Eyebrow>
      <StepHeading>
        One last thing.
        <br />
        <span style={{ color: 'var(--accent)' }}>
          Tell us when we&apos;re wrong.
        </span>
      </StepHeading>
      <Lede>
        When something changes — a new feature, a new city, a new way prices
        work — we&apos;ll let you know in-app and ask what you think. Loved it.
        Hated it. Either way, send it.
      </Lede>
      <div
        style={{
          padding: '14px',
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--fg-muted)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: 'var(--signal)',
              boxShadow: '0 0 8px var(--signal)',
            }}
          />
          Beta channel · always open
        </div>
        <div
          style={{
            fontFamily: 'Inter, system-ui',
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--fg)',
            letterSpacing: '-0.005em',
          }}
        >
          The &quot;give feedback&quot; button stays in the menu. You can also
          just email{' '}
          <span style={{ color: 'var(--signal)', fontWeight: 700 }}>
            hugh@concertcrawl.app
          </span>{' '}
          — it goes to me directly.
        </div>
      </div>
    </div>
  )
}
