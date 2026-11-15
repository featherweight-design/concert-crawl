'use client';

// The one write in the whole tour.
//
// Onboarding may never become a wall. Every failure path here ends by letting
// the visitor move on: an error advances (the picks are simply not made), and
// the artists are all still followable from search. Following is on every
// plan, so there is no upgrade path to hold the step for.

import { useCallback, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { followArtistsBulk } from '@/lib/following';
import {
  ARTIST_PICKS_KEY,
  GENRE_PICKS_KEY,
  SEARCH_PICKS_KEY,
  STEP_INDEX_KEY,
  clearPicks,
} from '@/components/consumer/artist-picker';

interface ArtistPicksCommit {
  /** True only while the bulk call is in flight (ACC-16). */
  pending: boolean;
  commit: (slugs: readonly string[]) => void;
}

/**
 * @param onDone Called once the step is finished with — a successful write, an
 * empty selection, or a failure we have decided not to make the visitor's
 * problem.
 */
export function useArtistPicksCommit(onDone: () => void): ArtistPicksCommit {
  const { getToken } = useAuth();
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  // Every exit that ends the step goes through here.
  //
  // Both keys clear together. The genres key is not the artists key's
  // companion — it is a filter for a screen that is now behind the visitor,
  // and the step's own lede promises we don't save it. Leaving it behind would
  // make that a lie on the next visit to /onboarding, which would open
  // pre-filtered by months-old buckets that may no longer be in the listings
  // at all, silently hiding suggestions.
  const finishStep = useCallback(() => {
    clearPicks(ARTIST_PICKS_KEY);
    clearPicks(GENRE_PICKS_KEY);
    // The step mirror goes with them. It exists to survive a round trip away
    // from the tour, and that trip is over: leaving it behind would reopen the
    // tour on the artists step for a visitor who has finished with it.
    clearPicks(SEARCH_PICKS_KEY);
    clearPicks(STEP_INDEX_KEY);
    onDone();
  }, [onDone]);

  const runCommit = useCallback(
    async (slugs: readonly string[]): Promise<void> => {
      if (inFlight.current) return;
      inFlight.current = true;
      setPending(true);
      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        await followArtistsBulk(token, slugs);
        finishStep();
      } catch (err: unknown) {
        // A failed write is not worth stranding someone on step 7 of 8. Log it
        // and move on; the artists are all still followable from search.
        console.warn('onboarding bulk follow failed; continuing', err);
        finishStep();
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [getToken, finishStep],
  );

  const commit = useCallback(
    (slugs: readonly string[]) => {
      if (slugs.length === 0) {
        // Nothing to write. Skipping is a first-class outcome here, so it
        // clears the mirror rather than leaving picks for a step that is done.
        finishStep();
        return;
      }
      void runCommit(slugs);
    },
    [finishStep, runCommit],
  );

  return { pending, commit };
}
