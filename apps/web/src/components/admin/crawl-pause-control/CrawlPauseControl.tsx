'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pause, Play } from 'lucide-react';
import type { CrawlPauseRequest } from '@concert-crawl/types';
import { AdminButton, SaveFailedToast } from '@/components/admin/primitives';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { pauseCrawling, resumeCrawling } from '@/lib/actions/venues';
import { PausePanel } from '@/components/admin/venues/PausePanel';
import {
  pausedStateLine,
  type PauseOutcome,
} from '@/components/admin/venues/pause-rules';
import type { CrawlPauseControlProps } from './definitions/types';

const COPY = ADMIN_COPY.venueDetailsClient.dangerZone.crawlPause;

/**
 * Stops every crawl of a venue while its shows stay published, for a venue
 * that asked us to stop or one whose source we may not use yet. Distinct from
 * hiding the venue, which takes its shows off the site. Pause opens the shared
 * Pause panel (`A3/03/pause-panel-d`) for this one venue.
 */
export const CrawlPauseControl = ({
  venue,
  showCount,
}: CrawlPauseControlProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [failedBody, setFailedBody] = useState<CrawlPauseRequest | null>(null);
  const paused = venue.crawlPausedAt !== null;

  const pause = async (body: CrawlPauseRequest): Promise<string | null> => {
    const outcome = await pauseCrawling(venue.id, body).catch(
      (): PauseOutcome => ({ ok: false, error: null }),
    );
    // A refused date stays in the panel; anything else closes it and says so.
    if (!outcome.ok && outcome.error !== null) return outcome.error;
    setOpen(false);
    setFailedBody(outcome.ok ? null : body);
    router.refresh();
    return null;
  };

  const resume = () => {
    startTransition(async () => {
      await resumeCrawling(venue.id);
      router.refresh();
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--fg)',
            }}
          >
            {COPY.title}
          </div>
          <div
            data-testid="crawl-pause-line"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: 'var(--fg-muted)',
              marginTop: 2,
              lineHeight: 1.4,
            }}
          >
            {pausedStateLine(venue) ?? COPY.description}
          </div>
        </div>
        <AdminButton
          variant="outline"
          size="sm"
          icon={paused ? Play : Pause}
          disabled={isPending}
          onClick={paused ? resume : () => setOpen(true)}
          type="button"
        >
          {paused ? COPY.resumeButton : COPY.pauseButton}
        </AdminButton>
      </div>
      {failedBody && (
        <SaveFailedToast
          what={COPY.failedWhat(venue.name)}
          saved={COPY.failedSaved}
          onRetry={() => {
            setFailedBody(null);
            void pause(failedBody);
          }}
        />
      )}
      {open && (
        <PausePanel
          venues={[{ id: venue.id, name: venue.name, eventCount: showCount }]}
          onClose={() => setOpen(false)}
          onSubmit={pause}
        />
      )}
    </div>
  );
};
