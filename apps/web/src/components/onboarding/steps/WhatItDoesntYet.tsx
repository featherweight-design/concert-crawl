import { Eyebrow, StepHeading, Lede } from './_primitives'

const ITEMS = [
  {
    title: 'Notifications.',
    body: "No push, no email alerts yet. We'll add them after we earn the right to interrupt you.",
  },
  {
    title: 'Cities outside Denver.',
    body: 'The crawl is regional for now. Other metros come once the system is solid.',
  },
  {
    title: 'Accounts that follow you across devices.',
    body: 'Watching is local-only this beta. Sign-in keeps your invite, not your list — yet.',
  },
  {
    title: 'Buying tickets.',
    body: "We'll never sell. We point you at the source and stay out of the transaction.",
  },
]

export function WhatItDoesntYet() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Eyebrow tone="accent">Not yet</Eyebrow>
      <StepHeading>What&apos;s missing — on purpose.</StepHeading>
      <Lede>
        Better to be straight with you than to ship something that pretends.
        Things on this list are coming, not abandoned.
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
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: 12,
              padding: '12px 14px',
              background: 'var(--surface-1)',
              border: '1px dashed var(--border-strong)',
              borderRadius: 10,
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--accent)',
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                padding: '3px 7px',
                borderRadius: 999,
                background: 'rgba(255,123,212,0.10)',
                alignSelf: 'start',
              }}
            >
              soon
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div
                style={{
                  fontFamily: 'Inter, system-ui',
                  fontSize: 14.5,
                  fontWeight: 700,
                  color: 'var(--fg)',
                  letterSpacing: '-0.005em',
                }}
              >
                {item.title}
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
                {item.body}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
