import type { CSSProperties } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { mergeDateTile, mergeDay } from './merge-rules';

const COPY = ADMIN_COPY.eventEdit.merge;

/** One listing as the pick step lists it. */
export interface MergePickRow {
  id: string;
  title: string;
  date: string;
  /** "Red Rocks · added by hand · 3 Watching" (`pickDetail`). */
  detail: string;
}

interface MergePickListProps {
  /** The listing the admin opened Merge from. */
  current: MergePickRow;
  /** The venue's name, for the nothing-found line (null: no venue). */
  venueName: string | null;
  /** The candidates load: `loading` shows a skeleton row, `error` a retry. */
  status: 'loading' | 'ready' | 'error';
  /**
   * Every other live listing at the same venue and day as `current`, in the
   * API's order (its own `likely` flag sorts first). The heading's hint says
   * "same venue and day", which is what holds for all of them.
   */
  likely: readonly MergePickRow[];
  onPick: (id: string) => void;
  onRetry: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  /** Search results across all dates; null until a search has run. */
  results: readonly MergePickRow[] | null;
  searching: boolean;
}

const LABEL: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--fg-muted)',
};

const ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: 12,
  borderRadius: 12,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  color: 'var(--fg)',
  font: 'inherit',
  textAlign: 'left',
};

const TILE: CSSProperties = {
  display: 'grid',
  justifyItems: 'center',
  minWidth: 40,
  padding: '4px 0',
  borderRadius: 8,
  background: 'var(--surface-2)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  lineHeight: 1.2,
};

const SECTION: CSSProperties = { display: 'grid', gap: 8 };

const DashedNote: CSSProperties = {
  padding: 14,
  borderRadius: 12,
  border: '1px dashed var(--border-strong)',
  fontSize: 13,
  color: 'var(--fg-muted)',
};

function Tile({ date }: { date: string }) {
  const { weekday, day } = mergeDateTile(date);
  return (
    <span aria-hidden style={TILE}>
      <span style={{ color: 'var(--fg-muted)' }}>{weekday}</span>
      <span style={{ fontSize: 15, fontWeight: 600 }}>{day}</span>
    </span>
  );
}

function RowBody({ row }: { row: MergePickRow }) {
  return (
    <>
      <Tile date={row.date} />
      <span style={{ display: 'grid', gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{row.title}</span>
        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          {row.detail}
        </span>
      </span>
    </>
  );
}

function PickRow({
  row,
  onPick,
}: {
  row: MergePickRow;
  onPick: (id: string) => void;
}) {
  return (
    <li style={{ listStyle: 'none' }}>
      <button
        type="button"
        onClick={() => onPick(row.id)}
        style={{ ...ROW, cursor: 'pointer' }}
        data-testid="merge-pick-row"
      >
        <RowBody row={row} />
        <span aria-hidden style={{ color: 'var(--fg-muted)' }}>
          ›
        </span>
      </button>
    </li>
  );
}

/**
 * The merge panel's first step (`gap-1/merge-pick`, 4b#15): the listing being
 * merged, the likely duplicates at the same venue and day, and a search over
 * every date. Presentational: the panel owns the loads and the pick.
 */
export function MergePickList({
  current,
  venueName,
  status,
  likely,
  onPick,
  onRetry,
  query,
  onQueryChange,
  results,
  searching,
}: MergePickListProps) {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section style={SECTION} aria-label={COPY.thisListing}>
        <span style={LABEL}>{COPY.thisListing}</span>
        <div style={ROW} data-testid="merge-pick-current">
          <RowBody row={current} />
        </div>
      </section>

      <section style={SECTION} aria-labelledby="merge-likely">
        <span style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span id="merge-likely" style={LABEL}>
            {COPY.likelyHeading}
          </span>
          {likely.length > 0 && (
            <span style={{ ...LABEL, textTransform: 'none' }}>
              {COPY.likelyHint}
            </span>
          )}
        </span>
        {status === 'loading' && (
          <div
            aria-busy="true"
            data-testid="merge-pick-skeleton"
            style={{ ...ROW, height: 64, background: 'var(--surface-2)' }}
          />
        )}
        {status === 'error' && (
          <div role="alert" style={DashedNote}>
            <span>{COPY.pickLoadFailed}</span>{' '}
            <button
              type="button"
              onClick={onRetry}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--signal)',
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              {COPY.retry}
            </button>
          </div>
        )}
        {status === 'ready' && likely.length === 0 && (
          <div style={DashedNote} data-testid="merge-pick-nothing">
            {COPY.nothingFound(venueName, mergeDay(current.date))}
          </div>
        )}
        {status === 'ready' && likely.length > 0 && (
          <ul style={{ display: 'grid', gap: 8, margin: 0, padding: 0 }}>
            {likely.map((row) => (
              <PickRow key={row.id} row={row} onPick={onPick} />
            ))}
          </ul>
        )}
      </section>

      <section style={SECTION} aria-labelledby="merge-find">
        <span id="merge-find" style={LABEL}>
          {COPY.searchHeading}
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={COPY.searchLabel}
          aria-label={COPY.searchLabel}
          className="admin-add-show-input"
        />
        {searching && (
          <div role="status" style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            {COPY.searching}
          </div>
        )}
        {!searching && results !== null && results.length === 0 && (
          <div style={DashedNote}>{COPY.noResults}</div>
        )}
        {!searching && results !== null && results.length > 0 && (
          <ul style={{ display: 'grid', gap: 8, margin: 0, padding: 0 }}>
            {results.map((row) => (
              <PickRow key={row.id} row={row} onPick={onPick} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
