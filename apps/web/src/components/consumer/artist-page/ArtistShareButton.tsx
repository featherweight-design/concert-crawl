'use client';

import { useEffect, useMemo, useState } from 'react';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { track } from '@/lib/analytics';
import { copyLink, type ShareCapabilities } from '@/lib/share/destinations';

import { ARTIST_COPY } from './definitions/copy';

/** How long "Link copied" or the failure line stays up. */
export const SHARE_STATUS_MS = 2600;

type ShareStatus = 'copied' | 'failed' | null;

export interface ArtistShareButtonProps {
  slug: string;
  name: string;
  /**
   * Injected so each branch is reachable from a test. Defaults to the real
   * `navigator` in the browser, the same slice the event share sheet reads.
   */
  capabilities?: ShareCapabilities;
}

/**
 * The share disc in the artist stage's top-right (B+ `09-artist`), the mirror
 * of the back chip. It shares the artist page's link: the boards draw no share
 * card for an artist (the share-image boards are all "Share this show"), so
 * there is no sheet and no poster, just the OS share sheet with copy-link as
 * the fallback, through the same `lib/share/destinations` helpers events use.
 *
 * ⚠️ Synchronous up to `share()`. `navigator.share` needs the click's transient
 * user activation, and any await before it spends that activation and the call
 * fails with NotAllowedError. Nothing is fetched, so nothing needs awaiting.
 */
export const ArtistShareButton = ({
  slug,
  name,
  capabilities,
}: ArtistShareButtonProps) => {
  const [status, setStatus] = useState<ShareStatus>(null);
  const caps: ShareCapabilities = useMemo(
    () =>
      capabilities ??
      (typeof navigator === 'undefined'
        ? {}
        : {
            ...(typeof navigator.share === 'function' && {
              share: navigator.share.bind(navigator),
            }),
            ...(navigator.clipboard !== undefined && {
              clipboard: navigator.clipboard,
            }),
          }),
    [capabilities],
  );

  useEffect(() => {
    if (status === null) return;
    const timer = window.setTimeout(() => setStatus(null), SHARE_STATUS_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  const onShare = () => {
    setStatus(null);
    const url = `${window.location.origin}/artists/${encodeURIComponent(slug)}`;

    if (typeof caps.share === 'function') {
      track('artist_shared', { artistSlug: slug, destination: 'system' });
      // A dismissed OS sheet rejects with AbortError: a cancel, not a failure.
      const onError = (err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('[artist-share] system share failed', {
          name: err instanceof Error ? err.name : 'unknown',
          err,
        });
        setStatus('failed');
      };
      // `share` can throw synchronously as well as reject.
      try {
        caps.share({ title: name, url }).catch(onError);
      } catch (err) {
        onError(err);
      }
      return;
    }

    // No OS sheet (most desktop browsers): copy the link. `copyLink` reaches
    // `writeText` before its first await, so this is still inside the click.
    track('artist_shared', { artistSlug: slug, destination: 'copy-link' });
    void copyLink(caps, url).then((outcome) =>
      setStatus(outcome === 'shared' ? 'copied' : 'failed'),
    );
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onShare}
        aria-label={ARTIST_COPY.shareAria}
        data-testid="artist-share"
        className="relative flex h-11 w-11 shrink-0 items-center justify-center"
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{
            // Same disc as the back chip and the event share: a wash mixed
            // from --bg is opposite --fg on every theme.
            background: 'color-mix(in oklab, var(--bg) 82%, transparent)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          {/* The node-graph share glyph, as on the event hero. */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="12" cy="3" r="2" stroke="var(--fg)" strokeWidth="1.6" />
            <circle cx="4" cy="8" r="2" stroke="var(--fg)" strokeWidth="1.6" />
            <circle
              cx="12"
              cy="13"
              r="2"
              stroke="var(--fg)"
              strokeWidth="1.6"
            />
            <path
              d="M5.8 7l4.4-2.6M5.8 9l4.4 2.6"
              stroke="var(--fg)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
      {/* Always mounted, so the announcement lands when the text changes. */}
      <span
        role="status"
        data-testid="artist-share-status"
        className="absolute right-0 top-full whitespace-nowrap"
      >
        {status !== null && (
          <span
            className="inline-block rounded-full text-fg"
            style={{
              marginTop: 4,
              padding: '5px 11px',
              fontSize: 12,
              fontWeight: 600,
              border: '1px solid var(--border-strong)',
              background:
                'color-mix(in oklab, var(--surface-1) 92%, transparent)',
            }}
          >
            {status === 'copied'
              ? CONSUMER_COPY.share.copyLinkDone
              : ARTIST_COPY.shareFailed}
          </span>
        )}
      </span>
    </div>
  );
};
