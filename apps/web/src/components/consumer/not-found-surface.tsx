import Link from 'next/link';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const copy = CONSUMER_COPY.notFound;

/**
 * The app's ordinary 404, drawn as the B+ not-found board (bp-s-notfound_m and
 * _d): a gradient 404 tile, the NOT FOUND eyebrow, the heading, the body and a
 * gradient Browse shows pill, set in the top third rather than centred.
 *
 * Shared so every boundary renders the same thing: a `not-found.tsx` only
 * covers its own segment and below, so each top-level route group needs its
 * own, including the global one at `app/not-found.tsx` that catches unknown
 * paths.
 */
export const NotFoundSurface = () => (
  <main
    data-testid="not-found-surface"
    aria-label={copy.heading}
    // Bottom padding is a class so the phone can take more: 48px sat under the
    // 52px BottomNav. 80px on the phone is the clearance every page under
    // the nav keeps; the shell adds the safe-area inset beneath it.
    className="pb-12 max-sm:pb-20"
    style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 64,
      paddingLeft: 24,
      paddingRight: 24,
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
        {copy.code}
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
      {copy.eyebrow}
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
      {copy.heading}
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
      {copy.body}
    </p>
    <Link
      href="/events"
      style={{
        marginTop: 28,
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
      }}
    >
      {copy.browseButton}
    </Link>
  </main>
);
