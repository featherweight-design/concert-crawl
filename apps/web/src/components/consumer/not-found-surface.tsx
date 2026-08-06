import Link from 'next/link'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.notFound

/**
 * The app's ordinary 404, extracted so a route that sits outside the app shell
 * can render the same thing rather than falling through to Next's unstyled
 * default. A `not-found.tsx` only covers its own segment and below, so every
 * top-level route group needs its own boundary — and the one thing that must
 * not differ between them is what the reader sees.
 */
export const NotFoundSurface = () => (
  <main
    aria-label={copy.heading}
    style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: '48px 24px',
      textAlign: 'center',
      color: 'var(--fg)',
      fontFamily: 'var(--font-ui)',
    }}
  >
    <h1
      style={{
        margin: 0,
        fontWeight: 900,
        fontSize: 24,
        letterSpacing: '-0.03em',
      }}
    >
      {copy.heading}
    </h1>
    <p
      style={{
        margin: 0,
        maxWidth: 360,
        fontSize: 14,
        lineHeight: 1.55,
        color: 'var(--fg-muted)',
      }}
    >
      {copy.body}
    </p>
    <Link
      href="/events"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        padding: '0 20px',
        borderRadius: 10,
        border: '1px solid var(--border-strong)',
        color: 'var(--fg)',
        fontSize: 13,
        fontWeight: 700,
        textDecoration: 'none',
      }}
    >
      {copy.browseButton}
    </Link>
  </main>
)
