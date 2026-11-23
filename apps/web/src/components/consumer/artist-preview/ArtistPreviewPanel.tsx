'use client';

// The preview with its follow wired: the one thing the sheet, the card and the
// palette drill-in each mount. It owns the by-MBID follow, so the three
// surfaces behave alike and a follow survives closing and reopening within the
// row's life (the parent keeps the panel mounted per row, or hands the state
// back through `onFollowChange`).

import type { ArtistSearchAllResult } from '@concert-crawl/types';

import { ArtistPreview } from './ArtistPreview';
import { useMbidFollow } from './lib/use-mbid-follow';

interface ArtistPreviewPanelProps {
  artist: ArtistSearchAllResult;
  /** Clerk's answer, `undefined` while it is still resolving. */
  isSignedIn: boolean | undefined;
}

export const ArtistPreviewPanel = ({
  artist,
  isSignedIn,
}: ArtistPreviewPanelProps) => {
  // A MusicBrainz-only act always carries its MBID; the row never opens the
  // preview without one.
  const follow = useMbidFollow(artist.mbid ?? '');
  const resolving = isSignedIn === undefined;

  return (
    <ArtistPreview
      artist={artist}
      following={follow.following}
      signedOut={isSignedIn === false}
      onToggle={resolving ? () => undefined : follow.toggle}
      pageHref={follow.slug ? `/artists/${follow.slug}` : null}
    />
  );
};
