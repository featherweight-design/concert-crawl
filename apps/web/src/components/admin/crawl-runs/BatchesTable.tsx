import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { VenueChip } from '@/components/admin/primitives';
import { CrawlAllButton } from '@/components/admin/crawl/CrawlAllDialog';
import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';
import type { BatchFilter, BatchRow } from './batch-data';
import {
  batchCost,
  batchLabel,
  batchStatus,
  batchSummary,
  batchTime,
  batchWhen,
  crawlRunsHref,
  isClickableBatch,
} from './batch-rules';

const COPY = ADMIN_COPY.crawlRuns;

/** Desktop-only parts, by the admin breakpoint in CSS. */
export const DESKTOP_ONLY = 'max-[720px]:hidden';

/** `07/crawl-runs-desktop`'s columns: WHEN, WHAT, RESULT, SUMMARY, TIME, COST. */
const COLUMNS = [
  { key: 'when', width: 90 },
  { key: 'what', width: 190 },
  { key: 'result', width: 120 },
  { key: 'summary', width: null },
  { key: 'time', width: 60 },
  { key: 'cost', width: 56 },
] as const;

const col = (width: number | null): CSSProperties =>
  width === null
    ? { flex: 1, minWidth: 0 }
    : { width, flex: 'none', minWidth: 0 };

const ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  borderTop: '1px solid var(--border)',
};

const CARD: CSSProperties = {
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'var(--surface-1)',
  overflow: 'hidden',
};

const NOWRAP: CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

/**
 * The page header (`07/crawl-runs-desktop`, `A3/09/runs-filters-m`): the
 * board's row is `align-items: flex-end; gap: 12px` (the 12px SectionHead
 * can't give), with no eyebrow. The phone shell draws the title, so the phone
 * shows the Next nightly line over a full-width Crawl all venues…; desktop
 * carries that line under the subtitle (row 26: in the header on both).
 * Server-safe, so `loading.tsx` draws the real header too.
 */
export const CrawlRunsHeader = () => (
  <header className="flex items-end gap-3 max-[720px]:flex-col max-[720px]:items-stretch">
    <div style={{ flex: 1, minWidth: 0 }}>
      <h1
        className={DESKTOP_ONLY}
        style={{
          margin: 0,
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--fg)',
        }}
      >
        {COPY.title}
      </h1>
      <p
        className={DESKTOP_ONLY}
        style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--fg-muted)' }}
      >
        {COPY.subtitle}
      </p>
      <p
        data-testid="crawl-runs-next-nightly"
        className="mt-1 text-[var(--fg-subtle)] max-[720px]:mt-0 max-[720px]:text-[var(--fg-muted)]"
        style={{ marginBottom: 0, fontSize: 12.5 }}
      >
        {COPY.nextNightly}
      </p>
    </div>
    <CrawlAllButton />
  </header>
);

const ColumnLabels = () => (
  <div style={{ display: 'flex', gap: 12, padding: '12px 18px' }}>
    {COLUMNS.map((column) => (
      <div key={column.key} style={col(column.width)}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.14em',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
          }}
        >
          {COPY.columns[column.key]}
        </span>
      </div>
    ))}
  </div>
);

/** A row as a link to `?run=` (the detail lands in PR3), or a plain row. */
const RowShell = ({
  batch,
  filter,
  style,
  label,
  children,
}: {
  batch: BatchRow;
  filter: BatchFilter;
  style: CSSProperties;
  label: string;
  children: ReactNode;
}) =>
  isClickableBatch(batch) ? (
    <Link
      href={crawlRunsHref(filter, batch.linkKey)}
      scroll={false}
      data-testid="crawl-batch-row"
      aria-label={label}
      style={{ ...style, color: 'var(--fg)', textDecoration: 'none' }}
    >
      {children}
    </Link>
  ) : (
    <div
      data-testid="crawl-batch-row"
      aria-label={label}
      role="group"
      style={{ ...style, color: 'var(--fg)' }}
    >
      {children}
    </div>
  );

const rowParts = (batch: BatchRow) => {
  const when = batchWhen(batch);
  const what = batchLabel(batch);
  const status = batchStatus(batch);
  const summary = batchSummary(batch);
  return {
    when,
    what,
    status,
    summary,
    label: COPY.rowLabel(
      COPY.whenLabel(when.date, when.time),
      what,
      status.label,
      summary,
    ),
  };
};

const muted = (size: number): CSSProperties => ({
  fontSize: size,
  color: 'var(--fg-muted)',
});

/** `07/crawl-runs-desktop`: the table card's rows. */
const DesktopRow = ({
  batch,
  filter,
}: {
  batch: BatchRow;
  filter: BatchFilter;
}) => {
  const { when, what, status, summary, label } = rowParts(batch);
  return (
    <RowShell
      batch={batch}
      filter={filter}
      label={label}
      style={{ ...ROW, padding: '10px 18px' }}
    >
      <div style={col(90)}>
        <div style={{ ...NOWRAP, fontSize: 13.5, fontWeight: 600 }}>
          {when.date}
        </div>
        <div style={{ ...NOWRAP, ...muted(12), marginTop: 2 }}>{when.time}</div>
      </div>
      <div style={{ ...col(190), ...NOWRAP, ...muted(12.5) }}>{what}</div>
      <div style={col(120)}>
        <VenueChip
          tone={status.tone}
          label={status.label}
          testId="batch-chip"
        />
      </div>
      <div style={{ ...col(null), ...muted(13) }}>{summary}</div>
      <div style={{ ...col(60), ...NOWRAP, ...muted(12.5) }}>
        {batchTime(batch)}
      </div>
      <div style={{ ...col(56), ...NOWRAP, ...muted(12.5) }}>
        {batchCost(batch)}
      </div>
    </RowShell>
  );
};

/**
 * The table's narrowest width: below it (the phone, until its cards land)
 * the table scrolls sideways rather than crushing the summary.
 */
const TABLE_MIN_WIDTH = 640;

const Scroll = ({ children }: { children: ReactNode }) => (
  <div style={{ overflowX: 'auto' }}>{children}</div>
);

/** The table card; `footer` is the Load more row. */
export const BatchesTable = ({
  batches,
  filter,
  footer,
}: {
  batches: readonly BatchRow[];
  filter: BatchFilter;
  footer: ReactNode;
}) => (
  <Scroll>
    <div
      data-testid="crawl-runs-table"
      style={{ ...CARD, minWidth: TABLE_MIN_WIDTH }}
    >
      <ColumnLabels />
      {batches.map((batch) => (
        <DesktopRow key={batch.key} batch={batch} filter={filter} />
      ))}
      {footer}
    </div>
  </Scroll>
);

const SKELETON_ROWS = 6;

/**
 * Loading (`A3/09/loading-runs-d`): the four filter pills, then the real
 * column labels over bar rows. No hooks, so a route's `loading.tsx` can use it.
 */
export const BatchesSkeleton = ({ filters = true }: { filters?: boolean }) => (
  <div
    data-testid="crawl-runs-skeleton"
    aria-busy="true"
    style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
  >
    {filters && (
      <div style={{ display: 'flex', gap: 8 }}>
        {[50, 74, 80, 76].map((width) => (
          <SkeletonBlock key={width} width={width} height={32} radius={999} />
        ))}
      </div>
    )}
    <Scroll>
      <div style={{ ...CARD, minWidth: TABLE_MIN_WIDTH }}>
        <ColumnLabels />
        {Array.from({ length: SKELETON_ROWS }, (_, row) => (
          <div key={row} style={{ ...ROW, padding: '14px 18px' }}>
            <div
              style={{
                ...col(90),
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              <SkeletonBlock width={52} height={12} radius={6} />
              <SkeletonBlock width={40} height={10} radius={6} />
            </div>
            <div style={col(190)}>
              <SkeletonBlock width={120} height={12} radius={6} />
            </div>
            <div style={col(120)}>
              <SkeletonBlock width={60} height={22} radius={999} />
            </div>
            <div style={col(null)}>
              <SkeletonBlock width="80%" height={12} radius={6} />
            </div>
            <div style={col(60)}>
              <SkeletonBlock width={36} height={12} radius={6} />
            </div>
            <div style={col(56)}>
              <SkeletonBlock width={32} height={12} radius={6} />
            </div>
          </div>
        ))}
      </div>
    </Scroll>
  </div>
);
