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

// The row as `add-two-scopes-m` draws it: a 44px tile, a 14.5px name and a mono
// 10.5px line under it, a hairline between rows. Only the venue truncates; the
// date never does (addendum 3 README 38).
const ShowRow = ({ row }: { row: PastShowRow }) => (
  <li
    data-testid="add-show-item"
    className="flex items-center gap-3 border-t border-[var(--border)] py-2.5 first:border-t-0"
  >
    <Panel
      surface="artist"
      name={row.artist}
      photoUrl={row.artistPhotoUrl}
      size={44}
    />
    <span className="min-w-0 flex-1">
      <span
        className="block truncate text-[14.5px] font-bold"
        style={{ color: 'var(--fg)' }}
      >
        {row.artist}
      </span>
      <span
        className="mt-[3px] flex text-[10.5px] font-medium"
        style={{
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.02em',
          color: 'var(--fg-muted)',
        }}
      >
        <span className="min-w-0 truncate">{row.venueName}</span>
        <span className="shrink-0 whitespace-pre">{` · ${row.dateLabel}`}</span>
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

// `add-loading-m`: a month-label bar, then rows with a hairline between them
// that fade out down the list. The pill is 72x32 on the board; the real pill is
// taller (a tap target), so the skeleton is the real size.
const SkeletonRows = ({
  count,
  withLabel = false,
}: {
  count: number;
  withLabel?: boolean;
}) => (
  <div aria-hidden="true" data-testid="add-show-skeleton">
    {withLabel && (
      <div className="mt-4">
        <SkeletonBlock width={110} height={9} radius={6} />
      </div>
    )}
    <ul className="m-0 mt-2 list-none p-0">
      {Array.from({ length: count }, (_, index) => (
        <li
          key={index}
          className="flex items-center gap-3 border-t border-[var(--border)] py-2.5 first:border-t-0"
          style={{ opacity: Math.max(0.4, 1 - index * 0.15) }}
        >
          <SkeletonBlock width={44} height={44} radius={10} />
          <span className="flex flex-1 flex-col gap-[7px]">
            <SkeletonBlock width="60%" height={13} radius={6} />
            <SkeletonBlock width="80%" height={10} radius={6} />
          </span>
          <SkeletonBlock width={72} height={44} radius={22} />
        </li>
      ))}
    </ul>
  </div>
);

const GradientButton = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="min-h-11 cursor-pointer rounded-xl border-0 px-6 text-[14.5px] font-bold"
    style={{
      background: 'linear-gradient(135deg, var(--signal), var(--cta-end))',
      color: 'var(--fg-on-accent)',
      boxShadow: '0 8px 24px -12px var(--signal)',
    }}
  >
    {children}
  </button>
);

// The red tile, eyebrow, headline and reassurance of `add-error-m`.
const LoadError = ({ onRetry }: { onRetry: () => void }) => (
  <div
    role="alert"
    data-testid="add-show-error"
    className="flex flex-col items-center px-2.5 py-[30px] text-center"
  >
    <span
      aria-hidden="true"
      className="flex h-[84px] w-[84px] items-center justify-center rounded-3xl"
      style={{
        background: 'color-mix(in oklab, var(--danger) 10%, transparent)',
        border: '1px solid color-mix(in oklab, var(--danger) 45%, transparent)',
        boxShadow:
          '0 0 40px color-mix(in oklab, var(--danger) 20%, transparent)',
        color: 'var(--danger)',
      }}
    >
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 4 3 19.5h18L12 4Z M12 10v4.5 M12 17v.01"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
    <span
      className="mt-[18px] text-[9.5px] font-bold"
      style={{
        ...mono,
        letterSpacing: '0.16em',
        color: 'var(--price-text-danger)',
      }}
    >
      {COPY.errorEyebrow}
    </span>
    <span
      className="mt-2 max-w-[320px] text-[28px] font-black leading-[1.1]"
      style={{ color: 'var(--fg)', letterSpacing: '-0.03em' }}
    >
      {COPY.errorTitle}
    </span>
    <p
      className="m-0 mt-2.5 max-w-[320px] text-[14.5px] leading-[1.5]"
      style={{ color: 'var(--fg-muted)' }}
    >
      {COPY.errorBody}
    </p>
    <div className="mt-[22px]">
      <GradientButton onClick={onRetry}>{COPY.retry}</GradientButton>
    </div>
  </div>
);

// `add-my-venues-empty-m`: a scope with nothing in it points back to All Denver.
const ScopeEmpty = ({
  scope,
  onShowAll,
}: {
  scope: 'venues' | 'follows';
  onShowAll: () => void;
}) => (
  <div data-testid="add-show-scope-empty" className="mt-[34px] text-center">
    <span
      aria-hidden="true"
      className="inline-flex"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle
          cx="12"
          cy="10.5"
          r="2.3"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </span>
    <p
      className="m-0 mt-3.5 text-[20px] font-black"
      style={{ color: 'var(--fg)', letterSpacing: '-0.02em' }}
    >
      {scope === 'venues' ? COPY.emptyVenuesTitle : COPY.emptyFollowsTitle}
    </p>
    <p
      className="m-0 mt-1.5 px-3 text-[13.5px] leading-[1.5]"
      style={{ color: 'var(--fg-muted)' }}
    >
      {scope === 'venues' ? COPY.emptyVenuesBody : COPY.emptyFollowsBody}
    </p>
    <button
      type="button"
      onClick={onShowAll}
      className="mt-3.5 min-h-11 cursor-pointer border-0 bg-transparent px-3 text-[15px] font-extrabold"
      style={{ color: 'var(--signal)' }}
    >
      {COPY.showAll}
    </button>
  </div>
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
    isPlaceholderData,
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

  const scopeEmpty =
    !isPending &&
    !isError &&
    !isPlaceholderData &&
    rows.length === 0 &&
    !searching &&
    (effectiveScope === 'venues' || effectiveScope === 'follows');

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={COPY.title}
      maxWidth={SHEET_WIDTH}
      closeText={COPY.done}
      eyebrow={COPY.eyebrow}
      pinned
      handle
      edgeFromSm
    >
      {/* Pinned: the title, search and chips stay put while the list scrolls
          (README 44), and the keyboard shrinks the list, not this. */}
      <div className="flex shrink-0 flex-col pt-2">
        <span
          aria-hidden="true"
          className="text-[25px] font-black leading-[1.1]"
          style={{ color: 'var(--fg)', letterSpacing: '-0.025em' }}
        >
          {COPY.title}
        </span>
        <p
          className="m-0 mt-1.5 text-[13.5px] leading-[1.45]"
          style={{ color: 'var(--fg-muted)' }}
        >
          {COPY.subtitle}
        </p>

        <label
          className="mt-3.5 flex h-[46px] items-center gap-2.5 rounded-xl border-[1.5px] px-3.5 focus-within:border-[var(--signal)]"
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
            className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none lg:text-[15px]"
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
            arrow-key movement these chips do not have. The chip is drawn 32px
            tall; a pseudo-element stretches its hit area to 44px. */}
        <div
          role="group"
          aria-label={COPY.scopeAria}
          className="mt-3 flex flex-wrap gap-1.5 pb-1"
        >
          {scopes.map((item) => {
            const on = effectiveScope === item.value;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={on}
                onClick={() => setScope(item.value)}
                className="relative inline-flex h-8 cursor-pointer before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']  items-center rounded-full border px-3 text-[13px] font-bold whitespace-nowrap"
                style={{
                  borderColor: on
                    ? 'color-mix(in oklab, var(--signal) 50%, transparent)'
                    : 'var(--border-strong)',
                  background: on
                    ? 'color-mix(in oklab, var(--signal) 12%, transparent)'
                    : 'transparent',
                  color: on ? 'var(--signal)' : 'var(--fg-muted)',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-6">
        {!searching && !scopeEmpty && (
          <p
            data-testid="add-records-note"
            className="m-0 mt-3 flex items-start gap-2.5 rounded-xl border border-dashed px-[13px] py-[11px] text-[12.5px] leading-[1.45]"
            style={{
              borderColor: 'var(--border-strong)',
              background: 'var(--surface-1)',
              color: 'var(--fg-muted)',
            }}
          >
            <span style={{ color: 'var(--signal)', marginTop: 1 }}>
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
            className="mt-3 block text-[9.5px] font-bold"
            style={{ ...mono, color: 'var(--fg-subtle)' }}
          >
            {COPY.resultCount(total)}
          </span>
        )}

        {isPending ? (
          <SkeletonRows count={SKELETON_ROWS} withLabel />
        ) : isError && (rows.length === 0 || isPlaceholderData) ? (
          <LoadError onRetry={() => void refetch()} />
        ) : scopeEmpty ? (
          <ScopeEmpty
            scope={effectiveScope === 'follows' ? 'follows' : 'venues'}
            onShowAll={() => setScope('all')}
          />
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
                  className="m-0 mt-4 text-[9.5px] font-bold"
                  style={{ ...mono, color: 'var(--fg-subtle)' }}
                >
                  {bucket.label}
                </h3>
                <ul className="m-0 mt-1 list-none p-0">
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
                className="flex flex-col gap-2 pb-2 pt-3"
              >
                {effectiveScope !== 'all' ? (
                  <p
                    className="m-0 text-[13.5px] leading-[1.45]"
                    style={{ color: 'var(--fg-muted)' }}
                  >
                    {effectiveScope === 'venues'
                      ? COPY.endLineVenues
                      : COPY.endLineFollows}
                  </p>
                ) : searching && singleArtist ? (
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
