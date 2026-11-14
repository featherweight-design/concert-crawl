'use client';

import type { CSSProperties } from 'react';
import { Check } from 'lucide-react';
import type { VenueLastFullRun } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, Spinner } from '@/components/admin/primitives';
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

export interface FilterOption<Key extends string> {
  key: Key;
  label: string;
  /** Drawn beside the label when above 0, read out as `countLabel`. */
  count?: number;
  countLabel?: string;
}

/** A run list's filter pills (`04/venue-runs`, `07/crawl-runs-desktop`). */
export const FilterPills = <Key extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly FilterOption<Key>[];
  value: Key;
  onChange: (next: Key) => void;
}) => (
  <div
    role="group"
    aria-label={label}
    style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
  >
    {options.map((option) => (
      <button
        key={option.key}
        type="button"
        aria-pressed={value === option.key}
        onClick={() => onChange(option.key)}
        style={pill(value === option.key)}
      >
        {option.label}
        {option.count !== undefined && option.count > 0 && (
          <span
            aria-label={option.countLabel}
            style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}
          >
            {option.count.toLocaleString('en-US')}
          </span>
        )}
      </button>
    ))}
  </div>
);

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
  <FilterPills
    label={COPY.filters.label}
    value={filter}
    onChange={onChange}
    options={RUN_FILTERS.map((key) =>
      key === 'notOk'
        ? {
            key,
            label: COPY.filters[key],
            count: notOkCount,
            countLabel: COPY.filters.notOkCount(notOkCount),
          }
        : { key, label: COPY.filters[key] },
    )}
  />
);

/**
 * The desktop row's columns (`04/venue-runs`): date over time, the chip,
 * the line, duration, cost. The board's 78px chip column only ever holds
 * "Skipped"; on the 22px venue chip "Unchanged" outruns it, so the chip
 * column is `max-content`. The list owns the grid and every row is a
 * subgrid of it, so the column is as wide as the widest chip loaded and
 * every line still starts at one x. The line is `minmax(0, 1fr)`, so it
 * takes the squeeze at the desktop min width.
 */
const DESKTOP_COLUMNS = '56px max-content minmax(0, 1fr) 46px 44px';

/** The desktop runs list: the grid every row subgrids (`04/venue-runs`). */
export const RUNS_LIST_DESKTOP_GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: DESKTOP_COLUMNS,
  columnGap: 12,
  rowGap: 4,
};

/** A row's share of the list grid: every column, on the list's tracks. */
const SUBGRID_ROW: CSSProperties = {
  display: 'grid',
  gridColumn: '1 / -1',
  gridTemplateColumns: 'subgrid',
  columnGap: 12,
};

const cell = (width: number, align: 'left' | 'right'): CSSProperties => ({
  display: 'block',
  width,
  flex: 'none',
  textAlign: align,
});

/**
 * One run. Desktop (`04/venue-runs`): date over time, the chip, the line,
 * duration and cost. Phone (`04/venue-runs-mobile`): date over time, the
 * line, the chip at the right. The whole row selects the run (highlighted,
 * `aria-current`); the run detail it will open lands in 4b.
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
    <li style={phone ? undefined : SUBGRID_ROW}>
      <button
        type="button"
        data-testid="run-row"
        aria-current={selected || undefined}
        aria-label={COPY.rowLabel(date, time, runOutcome(run), line)}
        onClick={onSelect}
        style={{
          // Desktop rows subgrid the list's columns so every row's line
          // starts at one x, whatever its chip; phone keeps its flex row.
          ...(phone
            ? { display: 'flex', alignItems: 'flex-start', gap: 10 }
            : { ...SUBGRID_ROW, alignItems: 'center' }),
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
            <span style={{ display: 'block', minWidth: 0 }}>
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

/**
 * `A3/09/runs-filter-empty-d`: nothing under the filter, and Show all. The
 * line is the venue Runs tab's "All N runs here were OK." unless the list
 * passes its own `message`.
 */
export const RunsFilterEmpty = ({
  count = 0,
  message,
  onShowAll,
}: {
  count?: number;
  message?: string;
  /** Left out, the line stands alone (a list with nothing to show at all). */
  onShowAll?: () => void;
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
      // #11162E as drawn: the board both run lists cite.
      background: 'var(--surface-1)',
    }}
  >
    <Check
      size={16}
      strokeWidth={2.2}
      aria-hidden
      style={{ color: 'var(--success)', flex: 'none' }}
    />
    <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
      {message ?? COPY.filterEmpty(count)}
    </span>
    {onShowAll && (
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
    )}
  </div>
);

export type LoadMoreState = 'idle' | 'loading' | 'failed';

/**
 * `A3/09/load-more`: "Showing 20" and Load 20 more; a spinner while it
 * loads; "Showing all 34" once there is no more. The runs API sends no total,
 * so the count is the rows shown; a list that has one passes `total` and
 * reads "Showing 25 of 140".
 */
export const LoadMoreFooter = ({
  shown,
  step,
  more,
  state,
  onLoadMore,
  total,
  note,
  failedLabel = COPY.loadMoreFailed,
  testId = 'runs-load-more',
  padding,
}: {
  shown: number;
  step: number;
  more: boolean;
  state: LoadMoreState;
  onLoadMore: () => void;
  total?: number | undefined;
  /** A line the list's board draws before the count (Past shows). */
  note?: string | undefined;
  failedLabel?: string;
  testId?: string;
  /**
   * The row's padding inside a table card, where the divider runs edge to
   * edge and the padding insets the content (`A3/09/load-more`: 12px 18px).
   * Left out, the footer pads only its top.
   */
  padding?: string;
}) => (
  <div
    data-testid={testId}
    style={{
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
      ...(padding === undefined ? { paddingTop: 12 } : { padding }),
      borderTop: '1px solid var(--border)',
    }}
  >
    <span style={{ fontSize: 12.5, color: 'var(--fg-subtle)' }}>
      {note ? `${note} ` : ''}
      {!more
        ? COPY.showingAll(shown)
        : total === undefined
          ? COPY.showing(shown)
          : COPY.showingOf(shown, total)}
    </span>
    <span style={{ flex: 1 }} />
    {state === 'failed' && (
      <span role="alert" style={{ fontSize: 12.5, color: 'var(--danger)' }}>
        {failedLabel}
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
            <Spinner size={13} />
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
