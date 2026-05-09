import Link from 'next/link'

export function WatchingEmpty() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        gap: 16,
        textAlign: 'center',
      }}
    >
      {/* Bookmark glyph */}
      <div
        style={{
          width: 64,
          height: 64,
          border: '2px dashed var(--fg-subtle)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--fg-subtle)',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 3h14a1 1 0 011 1v17l-8-4-8 4V4a1 1 0 011-1z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Headline */}
      <p
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 26,
          fontWeight: 900,
          letterSpacing: '-0.025em',
          color: 'var(--fg)',
          margin: 0,
        }}
      >
        Crickets.
      </p>

      {/* Body */}
      <p
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 13.5,
          color: 'var(--fg-muted)',
          margin: 0,
          maxWidth: 280,
          lineHeight: 1.5,
        }}
      >
        Nothing saved yet. Tap the heart on any show to track it here.
      </p>

      {/* CTA */}
      <Link
        href="/events"
        style={{
          display: 'inline-block',
          marginTop: 8,
          padding: '10px 20px',
          background: 'var(--signal)',
          color: 'var(--fg-on-accent)',
          fontFamily: 'var(--font-ui)',
          fontSize: 14,
          fontWeight: 700,
          borderRadius: 10,
          textDecoration: 'none',
          letterSpacing: '-0.01em',
        }}
      >
        Browse tonight&apos;s shows
      </Link>
    </div>
  )
}
