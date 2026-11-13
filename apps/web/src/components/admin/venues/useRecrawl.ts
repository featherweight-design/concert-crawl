'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  fetchCrawlTrigger,
  triggerVenueCrawl,
} from '@/components/admin/crawl-trigger-button/lib/crawl';
import { POLL_INTERVAL_MS } from '@/components/admin/crawl-trigger-button/definitions/constants';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

/**
 * Re-crawl's drawn states (`A3/03/re-crawl-states`): idle, Queued while the
 * trigger is pending, Crawling now while the crawler has it. `failed` is the
 * rule-10 toast's cue; the button is idle again behind it.
 */
export type RecrawlState = 'idle' | 'queued' | 'running' | 'failed';

/**
 * Queues one crawl (`POST /v1/admin/crawl/:id`) and polls its trigger
 * (`GET /crawl/triggers/:id`) until it settles, then refreshes the page so
 * the header and the latest run read the outcome. Each poll is scheduled only
 * after the last one resolves, so two never overlap.
 */
export const useRecrawl = (venueId: string) => {
  const { getToken } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<RecrawlState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const token = async (): Promise<string> => {
    const value = await getToken();
    if (!value) {
      throw new Error(ADMIN_COPY.crawlTriggerButton.errors.notAuthenticated);
    }
    return value;
  };

  const poll = async (triggerId: string): Promise<void> => {
    try {
      const trigger = await fetchCrawlTrigger(triggerId, await token());
      if (!alive.current) return;
      if (trigger.status === 'done' || trigger.status === 'failed') {
        // A failed trigger that wrote a run is a run outcome, read from the
        // run; one that never got a run didn't start.
        setState(
          trigger.status === 'failed' && trigger.crawlRunId === null
            ? 'failed'
            : 'idle',
        );
        router.refresh();
        return;
      }
      setState(trigger.status === 'processing' ? 'running' : 'queued');
      timer.current = setTimeout(() => void poll(triggerId), POLL_INTERVAL_MS);
    } catch (err) {
      console.warn('useRecrawl: poll failed', { venueId, err });
      if (alive.current) setState('failed');
    }
  };

  const start = async (): Promise<void> => {
    setState('queued');
    try {
      const { triggerId } = await triggerVenueCrawl(venueId, await token());
      if (!alive.current) return;
      timer.current = setTimeout(() => void poll(triggerId), POLL_INTERVAL_MS);
    } catch (err) {
      // A paused or disallowed venue is refused here (409): the refresh
      // brings the disabled Re-crawl and its reason.
      console.warn('useRecrawl: trigger refused', { venueId, err });
      if (!alive.current) return;
      setState('failed');
      router.refresh();
    }
  };

  return { state, start: () => void start() };
};
