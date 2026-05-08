import { Eyebrow, StepHeading, Lede } from './_primitives'

const ITEMS = [
  'Browse upcoming shows in the Denver area',
  'See real prices side-by-side, with their sources',
  "Watch shows you're curious about (saved locally for now)",
  'Submit a price you saw and help other fans',
]

export function WhatItDoesToday() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Eyebrow>Today</Eyebrow>
      <StepHeading>What you can do right now.</StepHeading>
      <Lede>
        We&apos;re starting small. Denver is the pilot. Here&apos;s what&apos;s
        actually in front of you on day one:
      </Lede>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {ITEMS.map((item, ii) => (
          <li
            key={ii}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 14px',
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 10,
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                flexShrink: 0,
                borderRadius: 9,
                background: 'var(--signal)',
                color: 'var(--fg-on-accent)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 16 16">
                <path
                  d="M3 8.5l3 3 7-8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </span>
            <span
              style={{
                fontFamily: 'Inter, system-ui',
                fontSize: 14.5,
                color: 'var(--fg)',
                lineHeight: 1.45,
                letterSpacing: '-0.005em',
              }}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
