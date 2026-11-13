'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import type { CrawlTrigger } from '@concert-crawl/types';
import { ApiError } from '@/lib/api';
import {
  fetchCrawlTrigger,
  triggerVenueCrawl,
} from '@/components/admin/crawl-trigger-button/lib/crawl';
import { POLL_INTERVAL_MS } from '@/components/admin/crawl-trigger-button/definitions/constants';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

/**
 * Re-crawl's drawn states (`A3/03/re-crawl-states`): idle, Queued while the
 * trigger is pending, Crawling now while the crawler has it. The rest are
 * settled outcomes the header reports:
 * - `refused`: it never started (the POST was refused, or the trigger failed
 *   before writing a run). The only one that offers Try again.
 * - `ranFailed`: the crawl ran and its run failed.
 * - `unknown`: queued, but polling kept failing, so its progress is unread.
 * - `stalled`: queued, but it never settled within `MAX_POLL_MS`.
 */
export type RecrawlState =
  | 'idle'
  | 'queued'
  | 'running'
  | 'refused'
  | 'ranFailed'
  | 'unknown'
  | 'stalled';

/** Retries after a failed poll, each at double the last delay. */
export const POLL_RETRIES = 3;

/** How long a queued re-crawl is polled before the header stops waiting. */
export const MAX_POLL_MS = 5 * 60 * 1000;

/** Ends in a full stop, so `states.saveFailed` can follow it. */
const asSentence = (text: string): string =>
  /[.!?]$/.test(text) ? text : `${text}.`;

/** The API's own reason for refusing, when it gave one. */
const refusalReason = (err: unknown): string | null =>
  err instanceof ApiError && err.message.trim() !== ''
    ? asSentence(err.message.trim())
    : null;

/**
 * Queues one crawl (`POST /v1/admin/crawl/:id`) and polls its trigger
 * (`GET /crawl/triggers/:id`) until it settles, then refreshes the page so
 * the header and the latest run read the outcome. Each poll is scheduled only
 * after the last one resolves, so two never overlap.
 *
 * `off` is the header's `recrawlOff` verdict: while it holds, `start` does
 * nothing, and a `refused` toast is cleared so it can't offer Try again.
 * While a trigger is being queued or polled, `start` does nothing either, so
 * one click can never queue two crawls.
 */
export const useRecrawl = (venueId: string, off: boolean) => {
  const { getToken } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<RecrawlState>('idle');
  const [reason, setReason] = useState<string | null>(null);
  const [forVenue, setForVenue] = useState(venueId);
  const [wasOff, setWasOff] = useState(off);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped on unmount and on a venue change: a request still in flight
  // belongs to an older generation and its result is dropped.
  const generation = useRef(0);
  // The trigger being queued (`triggerId` null while the POST is out) or
  // polled. Null when nothing is in flight.
  const pending = useRef<{ triggerId: string | null } | null>(null);

  // A different venue starts from idle (React's "adjust state on a prop
  // change" pattern); the effect below drops the old venue's poll.
  if (forVenue !== venueId) {
    setForVenue(venueId);
    setState('idle');
    setReason(null);
  }
  if (wasOff !== off) {
    setWasOff(off);
    if (off && state === 'refused') {
      setState('idle');
      setReason(null);
    }
  }

  useEffect(
    () => () => {
      generation.current += 1;
      pending.current = null;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    },
    [venueId],
  );

  const token = async (): Promise<string> => {
    const value = await getToken();
    if (!value) {
      throw new Error(ADMIN_COPY.crawlTriggerButton.errors.notAuthenticated);
    }
    return value;
  };

  const settle = (
    gen: number,
    next: RecrawlState,
    why: string | null = null,
  ): void => {
    if (gen !== generation.current) return;
    pending.current = null;
    timer.current = null;
    setState(next);
    setReason(why);
    router.refresh();
  };

  const schedule = (
    gen: number,
    triggerId: string,
    startedAt: number,
    failures: number,
  ): void => {
    timer.current = setTimeout(
      () => void poll(gen, triggerId, startedAt, failures),
      POLL_INTERVAL_MS * 2 ** failures,
    );
  };

  const poll = async (
    gen: number,
    triggerId: string,
    startedAt: number,
    failures: number,
  ): Promise<void> => {
    let trigger: CrawlTrigger;
    try {
      trigger = await fetchCrawlTrigger(triggerId, await token());
    } catch (err) {
      if (gen !== generation.current) return;
      console.warn('useRecrawl: poll failed', {
        venueId,
        triggerId,
        failures: failures + 1,
        err,
      });
      // The trigger is queued either way: never say it didn't start.
      if (failures >= POLL_RETRIES) settle(gen, 'unknown');
      else schedule(gen, triggerId, startedAt, failures + 1);
      return;
    }
    if (gen !== generation.current) return;
    if (trigger.status === 'done') {
      settle(gen, 'idle');
      return;
    }
    if (trigger.status === 'failed') {
      // The crawler marks a trigger failed with its run when the run failed,
      // and without one when it never got as far as a run.
      settle(gen, trigger.crawlRunId === null ? 'refused' : 'ranFailed');
      return;
    }
    if (Date.now() - startedAt >= MAX_POLL_MS) {
      settle(gen, 'stalled');
      return;
    }
    setState(trigger.status === 'processing' ? 'running' : 'queued');
    schedule(gen, triggerId, startedAt, 0);
  };

  const start = async (): Promise<void> => {
    if (off || pending.current !== null) return;
    const gen = generation.current;
    pending.current = { triggerId: null };
    setState('queued');
    setReason(null);
    let triggerId: string;
    try {
      ({ triggerId } = await triggerVenueCrawl(venueId, await token()));
    } catch (err) {
      // A paused, unverified or disallowed venue is refused here: the
      // refresh brings the disabled Re-crawl and its reason.
      console.warn('useRecrawl: trigger refused', { venueId, err });
      settle(gen, 'refused', refusalReason(err));
      return;
    }
    if (gen !== generation.current) return;
    pending.current = { triggerId };
    schedule(gen, triggerId, Date.now(), 0);
  };

  /** Clears a settled notice; never interrupts a crawl in flight. */
  const dismiss = (): void => {
    if (pending.current !== null) return;
    setState('idle');
    setReason(null);
  };

  return { state, reason, start: () => void start(), dismiss };
};
