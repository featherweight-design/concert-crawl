'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCachedEvents,
  getCachedVenues,
  type CachedEvent,
  type CachedVenue,
} from '@/lib/pwa/cached-content';
import {
  CachedShortcuts,
  CachedEmpty,
  TRY_AGAIN_CLASS,
  TRY_AGAIN_STYLE,
} from './CachedShortcuts';
import { NoSignalTile, NothingCachedTile } from './OfflineGlyphs';
import { OfflineChrome } from './OfflineChrome';
import { OFFLINE_COPY } from './definitions/copy';

// The offline page (B+ `bp-s-offline_m`, `bp-s-offline_empty_m`). With saved
// shows it leads with the sentence and lists them; with none it says so and
// offers the retry and the home page.
export const OfflineFallback = () => {
  const router = useRouter();
  const [events, setEvents] = useState<CachedEvent[]>([]);
  const [venues, setVenues] = useState<CachedVenue[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [nextEvents, nextVenues] = await Promise.all([
        getCachedEvents(),
        getCachedVenues(),
      ]);
      if (cancelled) return;
      setEvents(nextEvents);
      setVenues(nextVenues);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onRetry = useCallback(() => {
    router.refresh();
  }, [router]);

  const hasContent = events.length > 0 || venues.length > 0;
  const empty = loaded && !hasContent;

  return (
    <>
      <OfflineChrome />
      <main
        data-testid="offline-fallback"
        // Under the header (56px) with room for the bottom nav; the icon block
        // sits about 120px from the top, as bp-s-offline_empty_m draws it.
        className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-2xl flex-col gap-7 px-5 pb-28 pt-16"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          {empty ? <NothingCachedTile /> : <NoSignalTile />}
          <span
            className="mt-3 text-[12px] font-bold uppercase tracking-[0.2em] text-warning"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {OFFLINE_COPY.fallback.eyebrow}
          </span>
          {!empty && (
            <>
              <h1 className="text-[34px] font-black leading-[1.05] tracking-[-0.035em] text-fg">
                {OFFLINE_COPY.fallback.title}
              </h1>
              <p className="max-w-[360px] text-[15px] leading-relaxed text-fg-muted">
                {OFFLINE_COPY.fallback.sub}
              </p>
            </>
          )}
        </div>
        {empty ? (
          <CachedEmpty onRetry={onRetry} />
        ) : (
          <>
            {loaded && <CachedShortcuts events={events} venues={venues} />}
            {/* Offered before the cache read resolves too: the retry must never
              wait on it. */}
            <button
              type="button"
              onClick={onRetry}
              className={`${TRY_AGAIN_CLASS} mx-auto`}
              style={TRY_AGAIN_STYLE}
            >
              {OFFLINE_COPY.fallback.retry}
            </button>
          </>
        )}
      </main>
    </>
  );
};
