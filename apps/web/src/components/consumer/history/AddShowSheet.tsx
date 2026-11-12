'use client';

// "Add a show you went to" (edit-concerts add_sheet_m, add_dialog_d and addendum
// 3 `04-edit-your-concerts/add-*`): search the past nights in our records and
// stamp the ones you were at. One component for both widths, since BottomSheet
// is already a tall sheet below `sm` and a centred dialog from it.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PastShowRow, PastShowsScope } from '@concert-crawl/types';
import { recordsStartLabel, recordsStartShort } from '@concert-crawl/types';
import { BottomSheet } from '@/components/pwa/BottomSheet';
import { Panel } from '@/components/consumer/image-slot';
import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';
import { WentPill } from '@/components/consumer/went-pill/WentPill';
import { useEntitlement } from '@/lib/queries/use-entitlement';
import { usePastShows } from '@/lib/queries/use-past-shows';
import { HISTORY_COPY } from './definitions/copy';
import { groupHistoryByMonth } from './lib/buckets';

const COPY = HISTORY_COPY.add;
const SHEET_WIDTH = 560;
const SEARCH_DEBOUNCE_MS = 250;
const SKELETON_ROWS = 6;
const PAGING_SKELETON_ROWS = 2;

const SINCE = recordsStartLabel();
const SINCE_SHORT = recordsStartShort();

const mono = {
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
} as const;

const SearchIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="9" cy="9" r="5.75" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M13.5 13.5L17 17"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <rect
      x="1.75"
      y="3.25"
      width="12.5"
      height="11"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <path
      d="M1.75 6.75h12.5M5.25 1.75v2.5M10.75 1.75v2.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

const ShowRow = ({ row }: { row: PastShowRow }) => (
  <li
    data-testid="add-show-item"
    className="flex items-center gap-3 border-b border-[var(--border)] py-3 last:border-b-0"
  >
    <Panel
      surface="artist"
      name={row.artist}
      photoUrl={row.artistPhotoUrl}
      size={46}
    />
    <span className="min-w-0 flex-1">
      <span
        className="block truncate text-[17px] font-bold"
        style={{ color: 'var(--fg)', letterSpacing: '-0.01em' }}
      >
        {row.artist}
      </span>
      <span
        className="mt-0.5 block truncate text-[12.5px]"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-subtle)' }}
      >
        {`${row.venueName} · ${row.dateLabel}`}
      </span>
    </span>
    <WentPill
      eventId={row.eventId}
      artist={row.artist}
      venueSlug={row.venueSlug}
      venueName={row.venueName}
      dateLabel={`${row.dateLabel}, ${row.date.slice(0, 4)}`}
      attending={row.attendingAt !== null}
      afterStamp="undo"
    />
  </li>
);

const SkeletonRows = ({ count }: { count: number }) => (
  <ul
    aria-hidden="true"
    data-testid="add-show-skeleton"
    className="m-0 list-none p-0"
  >
    {Array.from({ length: count }, (_, index) => (
      <li key={index} className="flex items-center gap-3 py-3">
        <SkeletonBlock width={46} height={46} radius={10} />
        <span className="flex flex-1 flex-col gap-2">
          <SkeletonBlock width="55%" height={16} />
          <SkeletonBlock width="75%" height={12} />
        </span>
        <SkeletonBlock width={96} height={44} radius={22} />
      </li>
    ))}
  </ul>
);

interface AddShowSheetProps {
  open: boolean;
  onClose: () => void;
}

export const AddShowSheet = ({ open, onClose }: AddShowSheetProps) => {
  const { active: followsActive } = useEntitlement('following');
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  const [scope, setScope] = useState<PastShowsScope>('all');
  // BottomSheet's focus effect depends on `onClose`, so a new function on every
  // keystroke would pull focus out of the search box. Hand it one that never
  // changes and read the caller's latest from a ref.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const close = useCallback(() => onCloseRef.current(), []);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setTerm(text.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [text]);

  // The follows chip is hidden without its entitlement: fall back to the list
  // the reader can still see.
  const effectiveScope: PastShowsScope =
    scope === 'follows' && !followsActive ? 'all' : scope;

  const {
    data,
    isPending,
    isError,
    isFetchNextPageError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePastShows({ scope: effectiveScope, term, enabled: open });

  const rows = useMemo(
    () => data?.pages.flatMap((page) => page.rows) ?? [],
    [data],
  );
  const total = data?.pages[0]?.total ?? 0;
  const buckets = useMemo(
    () => groupHistoryByMonth(rows, { alwaysYear: true }),
    [rows],
  );

  // The sentinel lives at the foot of the list; reaching it loads the next page.
  const sentinel = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    const node = sentinel.current;
    // A failed page waits for its Try again rather than re-arming the sentinel
    // into a request loop against a failing API.
    if (!node || !hasNextPage || isFetchingNextPage || isFetchNextPageError) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void fetchNextPage();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
    rows.length,
  ]);

  const searching = term !== '';
  // "That's every {artist} show" is only true of an unscoped search that came
  // back as one artist; a venue name or a scope can return one act too.
  const singleArtist =
    effectiveScope === 'all' &&
    rows.length > 0 &&
    rows.every((row) => row.artist === rows[0]?.artist);
  const scopes: Array<{ value: PastShowsScope; label: string }> = [
    { value: 'all', label: COPY.scopeAll },
    { value: 'venues', label: COPY.scopeVenues },
    ...(followsActive
      ? [{ value: 'follows' as const, label: COPY.scopeFollows }]
      : []),
  ];

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={COPY.title}
      maxWidth={SHEET_WIDTH}
      closeText={COPY.done}
    >
      <div className="flex flex-col gap-3.5 pt-1">
        <span
          className="text-[11px] font-bold"
          style={{ ...mono, color: 'var(--signal)' }}
        >
          {COPY.eyebrow}
        </span>
        <span
          aria-hidden="true"
          className="text-[30px] font-extrabold leading-[1.05]"
          style={{ color: 'var(--fg)', letterSpacing: '-0.03em' }}
        >
          {COPY.title}
        </span>
        <p
          className="m-0 text-[15px] leading-[1.45]"
          style={{ color: 'var(--fg-muted)' }}
        >
          {COPY.subtitle}
        </p>

        <label
          className="flex min-h-12 items-center gap-2.5 rounded-xl border px-3.5 focus-within:border-[var(--signal)]"
          style={{
            borderColor: 'var(--border-strong)',
            background: 'var(--bg)',
            color: 'var(--fg-subtle)',
          }}
        >
          <SearchIcon />
          <input
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={COPY.searchPlaceholder}
            aria-label={COPY.searchPlaceholder}
            className="min-w-0 flex-1 border-0 bg-transparent text-[17px] outline-none"
            style={{ color: 'var(--fg)' }}
          />
          {text !== '' && (
            <button
              type="button"
              onClick={() => setText('')}
              aria-label={COPY.clearSearch}
              className="cursor-pointer border-0 bg-transparent p-1 text-[18px] leading-none"
              style={{ color: 'var(--fg-subtle)' }}
            >
              ×
            </button>
          )}
        </label>

        {/* A button group with `aria-pressed`: radio semantics would promise
            arrow-key movement these chips do not have. */}
        <div
          role="group"
          aria-label={COPY.scopeAria}
          className="flex flex-wrap gap-2"
        >
          {scopes.map((item) => {
            const on = effectiveScope === item.value;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={on}
                onClick={() => setScope(item.value)}
                className="min-h-11 cursor-pointer rounded-full border px-4 text-[15px] font-bold"
                style={{
                  borderColor: on
                    ? 'color-mix(in oklab, var(--signal) 55%, transparent)'
                    : 'var(--border-strong)',
                  background: on
                    ? 'color-mix(in oklab, var(--signal) 14%, transparent)'
                    : 'transparent',
                  color: on ? 'var(--signal)' : 'var(--fg-muted)',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {!searching && (
          <p
            data-testid="add-records-note"
            className="m-0 flex items-start gap-3 rounded-xl border border-dashed px-3.5 py-3 text-[15px] leading-[1.45]"
            style={{
              borderColor: 'var(--border-strong)',
              color: 'var(--fg-muted)',
            }}
          >
            <span style={{ color: 'var(--signal)', marginTop: 2 }}>
              <CalendarIcon />
            </span>
            <span>
              <strong style={{ color: 'var(--fg)' }}>
                {COPY.recordsLead(SINCE)}
              </strong>
              {COPY.recordsRest}
            </span>
          </p>
        )}

        {searching && !isPending && !isError && rows.length > 0 && (
          <span
            data-testid="add-show-count"
            className="text-[11px] font-bold"
            style={{ ...mono, color: 'var(--fg-subtle)' }}
          >
            {COPY.resultCount(total)}
          </span>
        )}

        {isPending ? (
          <SkeletonRows count={SKELETON_ROWS} />
        ) : isError && rows.length === 0 ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-2 py-3 text-[15px]"
            style={{ color: 'var(--fg-muted)' }}
          >
            <span>{COPY.loadFailed}</span>
            <button
              type="button"
              onClick={() => void refetch()}
              className="min-h-11 cursor-pointer rounded-full border px-4 font-bold"
              style={{
                borderColor: 'var(--border-strong)',
                background: 'transparent',
                color: 'var(--fg)',
              }}
            >
              {COPY.retry}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div
            data-testid="add-show-none"
            className="flex flex-col gap-1.5 py-4"
          >
            <span
              className="text-[18px] font-bold"
              style={{ color: 'var(--fg)' }}
            >
              {COPY.emptyTitle}
            </span>
            <p
              className="m-0 text-[15px] leading-[1.45]"
              style={{ color: 'var(--fg-muted)' }}
            >
              {COPY.emptyBody(SINCE)}
            </p>
          </div>
        ) : (
          <>
            {buckets.map((bucket) => (
              <section key={bucket.key} aria-label={bucket.label}>
                <h3
                  className="m-0 mb-1 mt-2 text-[11.5px] font-semibold"
                  style={{ ...mono, color: 'var(--fg-subtle)' }}
                >
                  {bucket.label}
                </h3>
                <ul className="m-0 list-none p-0">
                  {bucket.shows.map((row) => (
                    <ShowRow key={row.eventId} row={row} />
                  ))}
                </ul>
              </section>
            ))}
            {hasNextPage ? (
              <ul className="m-0 list-none p-0">
                <li ref={sentinel} aria-hidden="true" style={{ height: 1 }} />
              </ul>
            ) : null}
            {isFetchingNextPage && (
              <SkeletonRows count={PAGING_SKELETON_ROWS} />
            )}
            {/* A failed next page keeps the rows already loaded and offers its
                own retry, rather than replacing the list. */}
            {isFetchNextPageError && (
              <div
                role="alert"
                className="flex flex-col items-start gap-2 py-3 text-[15px]"
                style={{ color: 'var(--fg-muted)' }}
              >
                <span>{COPY.loadFailed}</span>
                <button
                  type="button"
                  onClick={() => void fetchNextPage()}
                  className="min-h-11 cursor-pointer rounded-full border px-4 font-bold"
                  style={{
                    borderColor: 'var(--border-strong)',
                    background: 'transparent',
                    color: 'var(--fg)',
                  }}
                >
                  {COPY.retry}
                </button>
              </div>
            )}
            {!hasNextPage && (
              <div
                data-testid="add-show-end"
                className="flex flex-col gap-2 pb-2 pt-1"
              >
                {searching && singleArtist ? (
                  <p
                    className="m-0 text-[15px]"
                    style={{ color: 'var(--fg-muted)' }}
                  >
                    {COPY.resultsFooter(rows[0]?.artist ?? '', SINCE)}
                  </p>
                ) : (
                  <>
                    <span
                      className="text-[11px] font-semibold"
                      style={{ ...mono, color: 'var(--fg-subtle)' }}
                    >
                      {COPY.endDivider(SINCE_SHORT)}
                    </span>
                    <p
                      className="m-0 text-[15px] leading-[1.45]"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      {COPY.endLine}
                    </p>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
};
