import { Eyebrow, StepHeading } from './_primitives'

export function FounderNote() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Eyebrow>A note from the maker</Eyebrow>
      <StepHeading>Hey — thanks for trying this thing.</StepHeading>
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
        <p style={{ margin: 0 }}>
          I&apos;m Hugh. I go to a lot of shows. Concert Crawl is the tool I
          always wanted: an honest place to see what&apos;s playing, what it
          costs, and whether it&apos;s worth the trip.
        </p>
        <p style={{ margin: 0 }}>
          This is a private beta. Lots of edges are still rough. Some screens
          are empty because the data isn&apos;t there yet. Some prices are
          missing because we couldn&apos;t pull a real one — and we&apos;d
          rather say that than make one up.
        </p>
        <p style={{ margin: 0, color: 'var(--fg-muted)' }}>
          You&apos;re here early on purpose. Tell me what works, what&apos;s
          confusing, what&apos;s missing. I&apos;ll read all of it. The product
          will change because of it.
        </p>
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
        >
          H
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
          — Hugh
        </div>
      </div>
    </div>
  )
}
