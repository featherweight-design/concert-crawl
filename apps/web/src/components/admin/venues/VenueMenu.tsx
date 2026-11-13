'use client';

import { useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import type {
  CrawlPauseRequest,
  VenueDeleteBlockers,
  VenueWithCrawlHealth,
} from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { RowMenu } from '@/components/admin/primitives';
import {
  activateVenue,
  pauseCrawling,
  resumeCrawling,
  setVenueFeatured,
} from '@/lib/actions/venues';
import { PausePanel } from './PausePanel';
import type { PauseOutcome } from './pause-rules';
import { venueMenuItems } from './venue-menu';
import { DeleteConfirm, HideConfirm, TakeDownConfirm } from './VenueConfirms';

const COPY = ADMIN_COPY.venueHeader;
const PAUSE = ADMIN_COPY.venueDetailsClient.dangerZone.crawlPause;

type Dialog = 'pause' | 'hide' | 'takeDown' | 'remove' | null;

/** A change that failed, for the header's rule-10 toast. */
export interface VenueMenuFailure {
  what: string;
  saved: string;
  /** True while Try again runs, so the toast's button holds. */
  retrying: boolean;
  retry: () => void;
}

/**
 * The venue header's ⋯ (`A3/03/venue-menu-states`) and every dialog behind
 * it: the shared Pause panel, and the Hide, Take down and Delete confirms.
 * Resume, flagship and Show on site are reversible, so they run at once, one
 * at a time; a failure goes to `onFailure` for the header's toast, with Try
 * again, and any later success clears it.
 */
export const VenueMenu = ({
  venue,
  triggerStyle,
  onFailure,
  onBusy,
}: {
  venue: VenueWithCrawlHealth;
  triggerStyle?: CSSProperties;
  onFailure: (failure: VenueMenuFailure | null) => void;
  /** Whether a change is in flight, so the header's Try again can hold. */
  onBusy?: (busy: boolean) => void;
}) => {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  // A 409's counts, kept only against the `deleteBlockers` they refused: the
  // refresh that follows brings the server's own, which win from then on.
  const [refusal, setRefusal] = useState<{
    blockers: VenueDeleteBlockers;
    against: VenueWithCrawlHealth['deleteBlockers'];
  } | null>(null);
  const refused =
    refusal !== null && refusal.against === venue.deleteBlockers
      ? refusal.blockers
      : null;
  const [pauseRefused, setPauseRefused] = useState<{
    body: CrawlPauseRequest;
    error: string;
  } | null>(null);
  // One immediate change in flight at a time. The ref guards a second press
  // before the re-render that disables the rows lands.
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const guarded = (task: () => Promise<void>): boolean => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    onBusy?.(true);
    void task().finally(() => {
      busyRef.current = false;
      setBusy(false);
      onBusy?.(false);
    });
    return true;
  };

  // No dialog opens while a change runs, so Show then Take down can't race.
  const open = (next: Exclude<Dialog, null>) => {
    if (busyRef.current) return;
    setDialog(next);
  };

  /** A failure whose Try again holds the toast while it runs. */
  const failure = (
    what: string,
    saved: string,
    again: () => boolean,
  ): VenueMenuFailure => ({
    what,
    saved,
    retrying: false,
    retry: () => {
      if (busyRef.current) return;
      onFailure({ ...failure(what, saved, again), retrying: true });
      again();
    },
  });

  // Rule 10: a failed change snaps back, and the toast can try it again.
  const attempt = (
    run: () => Promise<void>,
    what: string,
    saved: string,
  ): boolean =>
    guarded(async () => {
      try {
        await run();
        onFailure(null);
        router.refresh();
      } catch (err: unknown) {
        console.warn('VenueMenu: change failed', { what, err });
        onFailure(failure(what, saved, () => attempt(run, what, saved)));
      }
    });

  // As the old `CrawlPauseControl`: a refused date stays in the panel; any
  // other failure closes it with a toast whose Try again reopens a refusal.
  const pause = async (body: CrawlPauseRequest): Promise<string | null> => {
    const outcome = await pauseCrawling(venue.id, body).catch(
      (err: unknown): PauseOutcome => {
        console.warn('VenueMenu: pause failed', { venueId: venue.id, err });
        return { ok: false, error: null };
      },
    );
    if (!outcome.ok && outcome.error !== null) return outcome.error;
    setDialog(null);
    if (outcome.ok) router.refresh();
    onFailure(
      outcome.ok
        ? null
        : failure(PAUSE.failedWhat(venue.name), PAUSE.failedSaved, () =>
            guarded(async () => {
              const error = await pause(body);
              if (error === null) return;
              onFailure(null);
              setPauseRefused({ body, error });
              setDialog('pause');
            }),
          ),
    );
    return null;
  };

  const items = venueMenuItems(
    venue,
    {
      pause: () => {
        setPauseRefused(null);
        open('pause');
      },
      resume: () =>
        attempt(
          () => resumeCrawling(venue.id),
          COPY.failed.resume(venue.name),
          COPY.failed.resumeSaved,
        ),
      flagship: () =>
        attempt(
          () => setVenueFeatured(venue.id, !venue.featured),
          COPY.failed.flagship,
          COPY.failed.flagshipSaved,
        ),
      show: () =>
        attempt(
          () => activateVenue(venue.id),
          COPY.failed.show(venue.name),
          COPY.failed.showSaved,
        ),
      hide: () => open('hide'),
      takeDown: () => open('takeDown'),
      remove: () => open('remove'),
    },
    refused,
    busy,
  );
  const close = () => setDialog(null);
  // A confirmed change went through: any earlier failure is moot.
  const stay = () => {
    onFailure(null);
    close();
    router.refresh();
  };
  // A taken-down or deleted venue is done with, so the page goes back to the
  // Venues list, as the old danger zone's delete did.
  const leave = () => {
    onFailure(null);
    router.push('/admin/venues');
  };

  return (
    <>
      <RowMenu
        label={COPY.menuLabel(venue.name)}
        items={items}
        width={300}
        testId="venue-menu"
        {...(triggerStyle && { triggerStyle })}
      />
      {dialog === 'pause' && (
        <PausePanel
          venues={[
            {
              id: venue.id,
              name: venue.name,
              eventCount: venue.deleteBlockers?.upcomingShows ?? 0,
            },
          ]}
          onClose={() => {
            close();
            setPauseRefused(null);
          }}
          onSubmit={pause}
          refused={pauseRefused}
        />
      )}
      {dialog === 'hide' && (
        <HideConfirm venue={venue} onCancel={close} onDone={stay} />
      )}
      {dialog === 'takeDown' && (
        <TakeDownConfirm venue={venue} onCancel={close} onDone={leave} />
      )}
      {dialog === 'remove' && (
        <DeleteConfirm
          venue={venue}
          onCancel={close}
          onDone={leave}
          onRefused={(blockers) => {
            setRefusal({ blockers, against: venue.deleteBlockers });
            router.refresh();
          }}
        />
      )}
    </>
  );
};
