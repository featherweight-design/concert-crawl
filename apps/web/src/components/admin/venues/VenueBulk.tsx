'use client';

import { useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Pause, RefreshCw } from 'lucide-react';
import type { CrawlPauseRequest } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { SaveFailedToast, useContentBox } from '@/components/admin/primitives';
import { pauseCrawling, recrawlVenue } from '@/lib/actions/venues';
import { canRecrawl, fanOut, type PauseOutcome } from './pause-rules';
import type { VenueListRow } from './venue-list-rules';

const COPY = ADMIN_COPY.venuesList;
const BULK = COPY.bulk;

/** The bar's height (`A3/03/venues-select-d`); the list leaves room for it. */
export const SELECT_BAR_HEIGHT = 64;

type Failure =
  | { kind: 'pause'; ids: string[]; done: number; body: CrawlPauseRequest }
  | { kind: 'recrawl'; ids: string[]; done: number };

/**
 * Select mode's state and its two bulk actions. There is no bulk endpoint, so
 * each id is sent alone; the ones that fail stay selected (rule 10's snap
 * back) and a toast names them, with Try again.
 */
export const useVenueBulk = (listed: readonly VenueListRow[]) => {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [pausing, setPausing] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<{
    body: CrawlPauseRequest;
    error: string;
  } | null>(null);

  const picked = listed.filter((venue) => selected.has(venue.id));
  const nameOf = (id: string) =>
    listed.find((venue) => venue.id === id)?.name ?? id;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const setMany = (ids: readonly string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });
  const clear = () => setSelected(new Set());

  // What landed clears from the selection; what failed stays selected.
  const settle = (failed: string[], next: Failure) => {
    router.refresh();
    setSelected(new Set(failed));
    setFailure(failed.length > 0 ? next : null);
  };

  /** Resolves to the panel's inline error when the API refused the body. */
  const pause = async (
    ids: readonly string[],
    body: CrawlPauseRequest,
  ): Promise<string | null> => {
    setBusy(true);
    const { failed, inlineError } = await fanOut(ids, (id) =>
      pauseCrawling(id, body),
    ).finally(() => setBusy(false));
    // A date the API refuses is refused for every venue: fix it in place.
    if (inlineError !== null && failed.length === ids.length) {
      return inlineError;
    }
    setPausing(false);
    settle(failed, {
      kind: 'pause',
      ids: failed,
      done: ids.length - failed.length,
      body,
    });
    return null;
  };

  const recrawl = async (ids: readonly string[]) => {
    setBusy(true);
    const { failed } = await fanOut(ids, async (id): Promise<PauseOutcome> =>
      (await recrawlVenue(id)) ? { ok: true } : { ok: false, error: null },
    ).finally(() => setBusy(false));
    settle(failed, {
      kind: 'recrawl',
      ids: failed,
      done: ids.length - failed.length,
    });
  };

  // Try again from the toast. A pause refused outright now (a date that has
  // since passed) reopens the panel on the same venues and choices with the
  // refusal inline, instead of vanishing with the toast (as PR 1's review).
  const retry = async (current: Failure) => {
    setFailure(null);
    if (current.kind === 'recrawl') {
      await recrawl(current.ids);
      return;
    }
    const error = await pause(current.ids, current.body);
    if (error !== null) {
      setSelected(new Set(current.ids));
      setRefused({ body: current.body, error });
      setPausing(true);
    }
  };

  const toast = failure && (
    <SaveFailedToast
      what={BULK.pauseFailed(BULK.names(failure.ids.map(nameOf)))}
      {...(failure.kind === 'recrawl' && {
        title: BULK.recrawlFailed(BULK.names(failure.ids.map(nameOf))),
      })}
      saved={
        failure.done > 0
          ? BULK.othersDone(
              failure.done,
              failure.kind === 'pause' ? 'paused' : 'queued',
            )
          : failure.kind === 'pause'
            ? BULK.pauseNoneDone
            : BULK.recrawlNoneDone
      }
      retrying={busy}
      onRetry={() => void retry(failure)}
    />
  );

  return {
    selecting,
    selected,
    picked,
    pausing,
    busy,
    toast,
    toggle,
    setMany,
    clear,
    start: () => setSelecting(true),
    stop: () => {
      setSelecting(false);
      clear();
    },
    refused,
    openPause: () => {
      setRefused(null);
      setPausing(true);
    },
    closePause: () => {
      setPausing(false);
      setRefused(null);
    },
    pause,
    recrawl,
  };
};

/** The drawn 18px box: an outline, or signal-filled with a check. */
export const SelectBox = ({ on }: { on: boolean }) => (
  <span
    aria-hidden
    style={{
      width: 18,
      height: 18,
      borderRadius: 5,
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...(on
        ? { background: 'var(--signal)' }
        : { border: '1.5px solid var(--border-strong)' }),
    }}
  >
    {on && <Check size={12} strokeWidth={3} color="var(--bg)" aria-hidden />}
  </span>
);

const BAR_BUTTON: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 38,
  padding: '0 12px',
  borderRadius: 9,
  fontSize: 13.5,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  fontFamily: 'inherit',
  cursor: 'pointer',
  background: 'var(--surface-2)',
  color: 'var(--fg)',
  border: '1px solid var(--border-strong)',
};

/**
 * The pinned bottom bar (`A3/03/venues-select-d`): "{N} selected", Clear,
 * Re-crawl N and Pause crawling N…. Re-crawl counts only venues it can run on;
 * paused and auto-paused ones wait on Resume, and the reason shows beside it
 * (`A3/03/re-crawl-states`).
 */
export const SelectBar = ({
  bulk,
}: {
  bulk: ReturnType<typeof useVenueBulk>;
}) => {
  const content = useContentBox();
  const count = bulk.picked.length;
  const recrawlable = bulk.picked.filter(canRecrawl);
  const recrawlOff = recrawlable.length === 0 || bulk.busy;
  return (
    <div
      role="region"
      aria-label={BULK.selected(count)}
      data-testid="select-bar"
      style={{
        position: 'fixed',
        left: content.left,
        right: 0,
        bottom: 0,
        zIndex: 80,
        height: SELECT_BAR_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 28px',
        borderTop: '1px solid var(--border)',
        background: 'color-mix(in srgb, var(--bg-elevated) 92%, transparent)',
      }}
    >
      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>
        {BULK.selected(count)}
      </span>
      <button
        type="button"
        onClick={bulk.clear}
        disabled={count === 0}
        style={{
          ...BAR_BUTTON,
          height: 34,
          fontSize: 13,
          background: 'transparent',
          border: '1px solid transparent',
          color: 'var(--fg-muted)',
        }}
      >
        {BULK.clear}
      </button>
      <span style={{ flex: 1 }} />
      {recrawlable.length < count && (
        <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
          {BULK.recrawlPaused}
        </span>
      )}
      <button
        type="button"
        disabled={recrawlOff}
        onClick={() => void bulk.recrawl(recrawlable.map((venue) => venue.id))}
        style={{
          ...BAR_BUTTON,
          opacity: recrawlOff ? 0.45 : 1,
          cursor: recrawlOff ? 'default' : 'pointer',
        }}
      >
        <RefreshCw size={14} strokeWidth={1.8} aria-hidden />
        {BULK.recrawl(recrawlable.length)}
      </button>
      <button
        type="button"
        disabled={count === 0 || bulk.busy}
        onClick={bulk.openPause}
        style={{ ...BAR_BUTTON, opacity: count === 0 ? 0.45 : 1 }}
      >
        <Pause size={14} strokeWidth={1.8} aria-hidden />
        {BULK.pause(count)}
      </button>
    </div>
  );
};
