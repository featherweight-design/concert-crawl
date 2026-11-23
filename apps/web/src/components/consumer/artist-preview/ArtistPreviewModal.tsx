'use client';

// The phone sheet and the desktop card over /search. `ModalShell` already is
// both: a bottom sheet under the mobile query, a centred dialog above it.

import type { ArtistSearchAllResult } from '@concert-crawl/types';

import { ModalShell } from '@/components/consumer/modal-shell';

import { ArtistPreviewPanel } from './ArtistPreviewPanel';

interface ArtistPreviewModalProps {
  /** The tapped row, or null when nothing is open. */
  artist: ArtistSearchAllResult | null;
  isSignedIn: boolean | undefined;
  onClose: () => void;
}

export const ArtistPreviewModal = ({
  artist,
  isSignedIn,
  onClose,
}: ArtistPreviewModalProps) => (
  <ModalShell
    open={artist !== null}
    onClose={onClose}
    ariaLabel={artist?.name ?? ''}
    sheetHeight="fit"
    desktopWidth={420}
  >
    {artist && (
      // Keyed on the act so a second row's preview never inherits the first's
      // follow state.
      <ArtistPreviewPanel
        key={artist.mbid ?? artist.name}
        artist={artist}
        isSignedIn={isSignedIn}
      />
    )}
  </ModalShell>
);
