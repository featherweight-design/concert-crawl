'use client';

// The palette's drill-in (addendum 13): a back row over the same preview body,
// in place of the results list. It owns its own follow because the list it
// replaced is unmounted; what it learns goes back up through `onFollowed`, so
// the list the palette returns to shows the act as followed.

import { useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { ArtistSearchAllResult } from '@concert-crawl/types';

import { useArtistFollow } from '@/components/consumer/artist-page/lib/use-artist-follow';

import { ArtistPreview } from './ArtistPreview';
import { ARTIST_PREVIEW_COPY } from './definitions/copy';

interface PalettePreviewProps {
  artist: ArtistSearchAllResult;
  query: string;
  /** Clerk's answer, `undefined` while it is still resolving. */
  isSignedIn: boolean | undefined;
  onBack: () => void;
  /** The act now has a page: remember its slug for the list. */
  onFollowed: (mbid: string, slug: string) => void;
  /** Open their page was taken: the palette closes itself. */
  onOpenPage: () => void;
}

export const PalettePreview = ({
  artist,
  query,
  isSignedIn,
  onBack,
  onFollowed,
  onOpenPage,
}: PalettePreviewProps) => {
  const follow = useArtistFollow(null, artist.following, artist.mbid);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const resolving = isSignedIn === undefined;
  const signedOut = isSignedIn === false && !artist.following;
  const pageHref =
    follow.following && follow.slug ? `/artists/${follow.slug}` : null;

  // Keyboard path: Enter follows, then Enter opens the page. Focus goes to the
  // Follow on arrival and to Open their page once it exists, so each Enter is
  // the control's own.
  useEffect(() => {
    const target = bodyRef.current?.querySelector<HTMLElement>(
      pageHref ? 'a[href]' : 'button:not([disabled])',
    );
    target?.focus();
  }, [pageHref]);

  const { mbid } = artist;
  const { slug, following } = follow;
  useEffect(() => {
    if (mbid && slug && following) onFollowed(mbid, slug);
  }, [mbid, slug, following, onFollowed]);

  return (
    <div ref={bodyRef} style={{ padding: '4px 16px 16px' }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 44,
          fontSize: 13,
          color: 'var(--fg-muted)',
        }}
      >
        <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
        {ARTIST_PREVIEW_COPY.backToResults(query.trim())}
      </button>
      <ArtistPreview
        artist={artist}
        following={follow.following}
        signedOut={signedOut}
        onToggle={resolving ? () => undefined : follow.toggle}
        error={follow.error}
        pageHref={pageHref}
        onOpenPage={onOpenPage}
      />
    </div>
  );
};
