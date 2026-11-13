'use client';

import { useRouter } from 'next/navigation';
import { RELEASES } from '@/lib/definitions/releases';
import { useFeatureFlag } from '@/lib/queries/use-feature-flags';
import { useReleaseReadState } from './useReleaseReadState';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const COPY = CONSUMER_COPY.releaseNotes;

interface UserMenuVersionFooterProps {
  build: string;
  /**
   * Extra room at the right edge, px. The Settings page sets it so its last
   * chevron clears the fixed "Tell us" tab that sits on that edge.
   */
  endInset?: number;
}

export function UserMenuVersionFooter({
  build,
  endInset = 0,
}: UserMenuVersionFooterProps) {
  const router = useRouter();
  const latestVersion = RELEASES[0]?.version ?? '';
  const { unread } = useReleaseReadState(latestVersion);
  const { enabled: releaseNotesEnabled } = useFeatureFlag('release-notes');

  // Below every hook, so a late-landing flag read cannot change the hook
  // count. The footer's only action is a push to /whats-new, which the same
  // flag 404s.
  if (!releaseNotesEnabled) return null;

  return (
    <button
      type="button"
      onClick={() => void router.push('/whats-new')}
      aria-label={COPY.versionFooter.ariaLabel}
      style={{
        all: 'unset',
        cursor: 'pointer',
        width: '100%',
        padding: `10px ${14 + endInset}px 10px 14px`,
        borderTop: '1px solid var(--border)',
        background: 'var(--surface-1)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 5,
          flexShrink: 0,
          // The version's dot is grey and still (bp-m-account_m); the live,
          // pulsing one is the unread dot beside "What's new" on the right.
          background: 'var(--fg-subtle)',
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--fg-muted)',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {build}
      </span>
      <span style={{ flex: 1 }} />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          color: unread ? 'var(--accent)' : 'var(--fg-subtle)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {unread && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 6,
              background: 'var(--accent)',
              boxShadow: '0 0 6px var(--accent)',
              animation: 'rnPulse 1.4s ease-in-out infinite',
            }}
          />
        )}
        {unread ? COPY.versionFooter.unreadLabel : COPY.versionFooter.readLabel}
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M4 3l4 3-4 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
