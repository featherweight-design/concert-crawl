import { Eyebrow, StepHeading, Lede } from './_primitives'

const ROWS = [
  {
    kicker: '01',
    title: "We crawl, we don't sell.",
    body: "Concert Crawl reads public listings from venues and ticketers. We don't sell tickets and we don't take a cut. Tap a price, you go to the source.",
  },
  {
    kicker: '02',
    title: "Prices come from somewhere — we'll tell you where.",
    body: "Every price has a tag. RESALE means a marketplace. COMMUNITY means a fan submitted it. If we can't pull a face value, we'll say so instead of making one up.",
  },
  {
    kicker: '03',
    title: 'Verifications expire.',
    body: "A community price is more trustworthy after another fan confirms it — but even verified prices go stale after a week. We'll show you when something is old.",
  },
]

export function HowItWorks() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Eyebrow>How this works</Eyebrow>
      <StepHeading>Honest by design.</StepHeading>
      <Lede>
        Two minutes on what to expect from the prices, the listings, and what
        we&apos;ll never do.
      </Lede>
      <div
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        {ROWS.map((row, ii) => (
          <div
            key={row.kicker}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: 14,
              padding: '16px',
              borderTop: ii === 0 ? 'none' : '1px solid var(--border)',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'var(--surface-3)',
                border: '1px solid var(--border-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--signal)',
                letterSpacing: '0.04em',
              }}
            >
              {row.kicker}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div
                style={{
                  fontFamily: 'Inter, system-ui',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--fg)',
                  letterSpacing: '-0.01em',
                }}
              >
                {row.title}
              </div>
              <div
                style={{
                  fontFamily: 'Inter, system-ui',
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  color: 'var(--fg-muted)',
                  letterSpacing: '-0.005em',
                }}
              >
                {row.body}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
