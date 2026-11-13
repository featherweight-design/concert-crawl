// Not-found boundary for the public share mirror (#72), drawn as the B+ gone
// state (bp-s-public_gone_m).
//
// /e/:id sits outside the (protected) route group, so it does not inherit
// `app/(protected)/(main)/not-found.tsx` — without this file, `notFound()` here
// renders Next's bare built-in 404 as someone's very first contact with the
// product. A shared link outlives the show it points at, so this page is not a
// rare edge case.
import Link from 'next/link';
import React from 'react';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { isPublicBrowseEnabled } from '@/lib/launch-mode';

const copy = CONSUMER_COPY.publicEvent;

const PRIMARY_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 48,
  padding: '0 28px',
  borderRadius: 14,
  background: 'linear-gradient(90deg, var(--signal), var(--cta-end))',
  boxShadow:
    '0 8px 28px -10px color-mix(in oklch, var(--signal) 55%, transparent)',
  color: 'var(--fg-on-accent)',
  fontSize: 15,
  fontWeight: 800,
  textDecoration: 'none',
};

const SECONDARY_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 44,
  padding: '0 22px',
  borderRadius: 999,
  border: '1px solid var(--border-strong)',
  color: 'var(--fg-muted)',
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
};

const PublicEventNotFound = () => {
  // The browse link is launch-mode-dependent. /events is only public once the
  // launch flag is on; sending a signed-out visitor there before launch bounces
  // them straight to /sign-in, which is a second dead end on top of the first.
  // The landing page is always public, so before launch it is the one CTA, and
  // after launch it steps down to the quiet second button the board draws.
  const launched = isPublicBrowseEnabled();

  return (
    <main
      aria-label={copy.notFoundHeading}
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '64px 24px 48px',
        textAlign: 'center',
        color: 'var(--fg)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div
        aria-hidden
        data-testid="not-found-tile"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 84,
          height: 84,
          borderRadius: 24,
          background: 'var(--surface-2)',
          border:
            '1px solid color-mix(in oklch, var(--signal) 40%, var(--border))',
          boxShadow:
            '0 0 36px color-mix(in oklch, var(--signal) 18%, transparent)',
        }}
      >
        <span
          style={{
            fontSize: 32,
            fontWeight: 900,
            letterSpacing: '-0.04em',
            background: 'linear-gradient(90deg, var(--signal), var(--accent))',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {copy.notFoundCode}
        </span>
      </div>
      <p
        style={{
          margin: '24px 0 0',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--signal)',
        }}
      >
        {copy.notFoundEyebrow}
      </p>
      <h1
        style={{
          margin: '10px 0 0',
          fontWeight: 900,
          fontSize: 30,
          letterSpacing: '-0.04em',
          lineHeight: 1.1,
        }}
      >
        {copy.notFoundHeading}
      </h1>
      <p
        style={{
          margin: '12px 0 0',
          maxWidth: 320,
          fontSize: 15,
          lineHeight: 1.55,
          color: 'var(--fg-muted)',
        }}
      >
        {copy.notFoundBody}
      </p>
      <div
        style={{
          marginTop: 28,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {launched && (
          <Link href="/events" style={PRIMARY_STYLE}>
            {copy.notFoundBrowseButton}
          </Link>
        )}
        <Link href="/" style={launched ? SECONDARY_STYLE : PRIMARY_STYLE}>
          {copy.notFoundHomeButton}
        </Link>
      </div>
    </main>
  );
};

export default PublicEventNotFound;
