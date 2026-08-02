// Not-found boundary for every route inside the app shell (#1115, PR-E).
//
// Nothing owned one before this: `notFound()` from the venue and event routes
// fell through to Next's unstyled default page, outside the app chrome. Living
// at `(main)` means the nav and theme survive, and all three verticals get the
// same treatment.
import Link from 'next/link'
import React from 'react'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.notFound

const NotFound = () => (
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

export default NotFound
