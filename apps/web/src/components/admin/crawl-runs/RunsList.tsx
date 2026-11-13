'use client';

import type { CSSProperties } from 'react';
import { Check } from 'lucide-react';
import type { VenueLastFullRun } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton } from '@/components/admin/primitives';
import {
  runOutcome,
  shortDate,
  shortTime,
} from '@/components/admin/venues/overview/overview-rules';
import { RunChip } from './RunChip';
import type { RunRow } from './run-data';
import {
  RUN_FILTERS,
  runCost,
  runDuration,
  runLine,
  type RunFilter,
} from './runs-rules';

const COPY = ADMIN_COPY.venueRuns;

/** The board's selected outline: a gradient border on the elevated fill. */
const GRADIENT_BORDER =
  'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box';

/** A pill in the All / Not OK filter (`04/venue-runs`). */
const pill = (on: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  height: 32,
  padding: '0 12px',
  borderRadius: 999,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  ...(on
    ? {
        color: 'var(--fg)',
        border: '1px solid transparent',
        background: GRADIENT_BORDER,
      }
    : {
        color: 'var(--fg-muted)',
        border: '1px solid var(--border)',
        background: 'color-mix(in srgb, var(--bg-elevated) 60%, transparent)',
      }),
});

/** All / Not OK. Not OK carries the count of loaded runs that weren't. */
export const RunFilters = ({
  filter,
  notOkCount,
  onChange,
}: {
  filter: RunFilter;
  notOkCount: number;
  onChange: (next: RunFilter) => void;
}) => (
  <div
    role="group"
    aria-label={COPY.filters.label}
    style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
  >
    {RUN_FILTERS.map((key) => (
      <button
        key={key}
        type="button"
        aria-pressed={filter === key}
        onClick={() => onChange(key)}
        style={pill(filter === key)}
      >
        {COPY.filters[key]}
        {key === 'notOk' && notOkCount > 0 && (
          <span
            aria-label={COPY.filters.notOkCount(notOkCount)}
            style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}
          >
            {notOkCount.toLocaleString('en-US')}
          </span>
        )}
      </button>
    ))}
  </div>
);

const cell = (width: number, align: 'left' | 'right'): CSSProperties => ({
  display: 'block',
  width,
  flex: 'none',
  textAlign: align,
});

/**
 * One run. Desktop (`04/venue-runs`): date over time, the chip, the line,
 * duration and cost. Phone (`04/venue-runs-mobile`): date over time, the
 * line, the chip at the right. The whole row opens the run's detail.
 */
export const RunListRow = ({
  run,
  lastFullRun,
  selected,
  phone,
  onSelect,
}: {
  run: RunRow;
  lastFullRun: VenueLastFullRun | null;
  selected: boolean;
  phone: boolean;
  onSelect: () => void;
}) => {
  const date = shortDate(run.createdAt);
  const time = shortTime(run.createdAt);
  const line = runLine(run, lastFullRun);
  const when = (
    <span style={cell(phone ? 52 : 56, 'left')}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>
        {date}
      </span>
      <span
        style={{
          display: 'block',
          fontSize: phone ? 11 : 11.5,
          color: 'var(--fg-subtle)',
        }}
      >
        {time}
      </span>
    </span>
  );
  return (
    <li>
      <button
        type="button"
        data-testid="run-row"
        aria-haspopup="dialog"
        aria-current={selected || undefined}
        aria-label={COPY.rowLabel(date, time, runOutcome(run), line)}
        onClick={onSelect}
        style={{
          display: 'flex',
          alignItems: phone ? 'flex-start' : 'center',
          gap: phone ? 10 : 12,
          width: '100%',
          minWidth: 0,
          padding: phone ? '11px 0' : '10px 12px',
          borderRadius: phone ? 0 : 10,
          fontFamily: 'inherit',
          textAlign: 'left',
          color: 'var(--fg)',
          cursor: 'pointer',
          ...(phone
            ? {
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
              }
            : selected
              ? { border: '1px solid transparent', background: GRADIENT_BORDER }
              : { border: '1px solid transparent', background: 'transparent' }),
        }}
      >
        {when}
        {phone ? (
          <>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 12.5,
                lineHeight: 1.4,
                color: 'var(--fg-muted)',
                overflowWrap: 'anywhere',
              }}
            >
              {line}
            </span>
            <span style={{ flex: 'none' }}>
              <RunChip run={run} />
            </span>
          </>
        ) : (
          <>
            <span style={cell(78, 'left')}>
              <RunChip run={run} />
            </span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 13,
                color: 'var(--fg-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {line}
            </span>
            <span
              style={{
                ...cell(46, 'right'),
                fontSize: 12,
                color: 'var(--fg-subtle)',
              }}
            >
              {runDuration(run.durationMs)}
            </span>
            <span
              style={{
                ...cell(44, 'right'),
                fontSize: 12,
                color: 'var(--fg-subtle)',
              }}
            >
              {runCost(run.llmCostUsd)}
            </span>
          </>
        )}
      </button>
    </li>
  );
};

/** `A3/09/runs-filter-empty-d`: nothing under the filter, and Show all. */
export const RunsFilterEmpty = ({
  count,
  onShowAll,
}: {
  count: number;
  onShowAll: () => void;
}) => (
  <div
    role="status"
    data-testid="runs-filter-empty"
    style={{
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
      padding: '16px 18px',
      borderRadius: 14,
      border: '1px solid var(--border)',
      background: 'var(--bg-elevated)',
    }}
  >
    <Check
      size={16}
      strokeWidth={2.2}
      aria-hidden
      style={{ color: 'var(--success)', flex: 'none' }}
    />
    <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
      {COPY.filterEmpty(count)}
    </span>
    <AdminButton
      type="button"
      variant="outline"
      onClick={onShowAll}
      style={{
        height: 30,
        fontSize: 12.5,
        borderRadius: 9,
        background: 'var(--surface-2)',
      }}
    >
      {COPY.showAll}
    </AdminButton>
  </div>
);

export type LoadMoreState = 'idle' | 'loading' | 'failed';

/**
 * `A3/09/load-more`: "Showing 20" and Load 20 more; a spinner while it
 * loads; "Showing all 34" once there is no more. The API sends no total, so
 * the count is the rows shown.
 */
export const LoadMoreFooter = ({
  shown,
  step,
  more,
  state,
  onLoadMore,
}: {
  shown: number;
  step: number;
  more: boolean;
  state: LoadMoreState;
  onLoadMore: () => void;
}) => (
  <div
    data-testid="runs-load-more"
    style={{
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
      paddingTop: 12,
      borderTop: '1px solid var(--border)',
    }}
  >
    <span style={{ fontSize: 12.5, color: 'var(--fg-subtle)' }}>
      {more ? COPY.showing(shown) : COPY.showingAll(shown)}
    </span>
    <span style={{ flex: 1 }} />
    {state === 'failed' && (
      <span role="alert" style={{ fontSize: 12.5, color: 'var(--danger)' }}>
        {COPY.loadMoreFailed}
      </span>
    )}
    {more && (
      <AdminButton
        type="button"
        variant="outline"
        aria-disabled={state === 'loading' || undefined}
        onClick={() => {
          if (state !== 'loading') onLoadMore();
        }}
        style={{
          height: 30,
          fontSize: 12.5,
          borderRadius: 9,
          background: 'var(--surface-2)',
          ...(state === 'loading' && { color: 'var(--fg-muted)' }),
        }}
      >
        {state === 'loading' ? (
          <>
            <svg
              width={13}
              height={13}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              aria-hidden
              className="motion-safe:animate-spin"
            >
              <circle cx={12} cy={12} r={9} opacity={0.25} />
              <path d="M21 12a9 9 0 00-9-9" />
            </svg>
            {COPY.loading}
          </>
        ) : state === 'failed' ? (
          COPY.tryAgain
        ) : (
          COPY.loadMore(step)
        )}
      </AdminButton>
    )}
  </div>
);
