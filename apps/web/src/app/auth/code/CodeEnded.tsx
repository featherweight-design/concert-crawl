import Link from 'next/link';
import { CCMark } from '@/components/brand/cc-mark';
import { STATE_CTA_GRADIENT } from '@/components/consumer/empty-state/StateCard';
import { copy } from './definitions/copy';

const ended = copy.ended;

/**
 * What a fan sees when the code they opened was ended on purpose by an admin
 * (`admin addendum-3 12/code-ended-fan-m`): the mark, the plain news, and two
 * ways on. It is a page, not an inline error, because there is nothing to
 * retype: the code is gone.
 */
export function CodeEnded() {
  return (
    <main
      data-testid="code-ended"
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        color: 'var(--fg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '60px 24px 24px',
        fontFamily: 'Inter, system-ui',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid var(--border)',
          }}
        >
          <CCMark size={58} />
        </span>
        <h1
          style={{
            margin: '36px 0 0',
            fontWeight: 900,
            fontSize: 28,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}
        >
          {ended.heading}
        </h1>
        <p
          style={{
            margin: '14px 0 0',
            fontSize: 16,
            lineHeight: 1.45,
            color: 'var(--fg-muted)',
          }}
        >
          {ended.body}
        </p>
        <div
          style={{
            marginTop: 28,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <Link
            href={ended.browseHref}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 48,
              borderRadius: 12,
              background: STATE_CTA_GRADIENT,
              color: 'var(--fg-on-accent)',
              fontSize: 15,
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            {ended.browse}
          </Link>
          <Link
            href={ended.signInHref}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 46,
              borderRadius: 12,
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-1)',
              color: 'var(--fg)',
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {ended.signIn}
          </Link>
        </div>
      </div>
    </main>
  );
}
