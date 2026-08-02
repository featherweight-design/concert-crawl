// Not-found boundary for the public share mirror (#72).
//
// /e/:id sits outside the (protected) route group, so it does not inherit
// `app/(protected)/(main)/not-found.tsx` — without this file, `notFound()` here
// renders Next's bare built-in 404 as someone's very first contact with the
// product. A shared link outlives the show it points at, so this page is not a
// rare edge case.
import Link from 'next/link'
import React from 'react'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { isPublicBrowseEnabled } from '@/lib/launch-mode'

const copy = CONSUMER_COPY.publicEvent

const PublicEventNotFound = () => {
  // The CTA target is launch-mode-dependent. /events is only public once the
  // launch flag is on; sending a signed-out visitor there before launch bounces
  // them straight to /sign-in, which is a second dead end on top of the first.
  // The landing page is always public, so that is the pre-launch destination.
  const launched = isPublicBrowseEnabled()
  const href = launched ? '/events' : '/'
  const label = launched ? copy.notFoundBrowseButton : copy.notFoundHomeButton

  return (
    <main
      aria-label={copy.notFoundHeading}
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
        {copy.notFoundHeading}
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
        {copy.notFoundBody}
      </p>
      <Link
        href={href}
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
        {label}
      </Link>
    </main>
  )
}

export default PublicEventNotFound
