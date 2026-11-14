import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { VenueChip } from '@/components/admin/primitives';
import { CrawlAllButton } from '@/components/admin/crawl/CrawlAllDialog';
import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';
import { shortTime } from '@/components/admin/venues/overview/overview-rules';
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

/** Phone-only and desktop-only parts, by the admin breakpoint in CSS. */
export const PHONE_ONLY = 'min-[721px]:hidden';
export const DESKTOP_ONLY = 'max-[720px]:hidden';

/** `07/crawl-runs-desktop`'s columns: WHEN, WHAT, RESULT, SUMMARY, TIME, COST. */
const COLUMNS = ['when', 'what', 'result', 'summary', 'time', 'cost'] as const;

/**
 * The board's widths (90, 190, 120, the rest, 60, 56; 12 apart, 18 in from
 * the card's edges) on one grid every row subgrids, so the columns line up.
 * The board never draws a venue and a handle together in WHAT ("Re-crawl ·
 * Ball Arena · by @hugh" outruns 190), so WHAT is at least 190 and widens to
 * its longest label, taken from SUMMARY. The 6px edge tracks plus the 12 gap
 * make the board's 18px inset.
 */
const GRID_COLUMNS =
  '6px 90px minmax(190px, max-content) 120px minmax(0, 1fr) 60px 56px 6px';

const CELL: CSSProperties = { minWidth: 0 };
/** The first cell starts after the edge track. */
const FIRST_CELL: CSSProperties = { minWidth: 0, gridColumnStart: 2 };

/** A row's share of the card's grid. */
const ROW: CSSProperties = {
  display: 'grid',
  gridColumn: '1 / -1',
  gridTemplateColumns: 'subgrid',
  alignItems: 'center',
  borderTop: '1px solid var(--border)',
};

const CARD: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: GRID_COLUMNS,
  columnGap: 12,
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
 * The time is the API's next nightly; with none (not production, or not
 * loaded yet) the line is left off. Server-safe, so `loading.tsx` draws the
 * real header too.
 */
export const CrawlRunsHeader = ({
  nextCrawlAt = null,
}: {
  nextCrawlAt?: string | null;
}) => (
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
      {nextCrawlAt !== null && (
        <p
          data-testid="crawl-runs-next-nightly"
          className="mt-1 text-[var(--fg-subtle)] max-[720px]:mt-0 max-[720px]:text-[var(--fg-muted)]"
          style={{ marginBottom: 0, fontSize: 12.5 }}
        >
          {COPY.nextNightly(shortTime(nextCrawlAt))}
        </p>
      )}
    </div>
    <CrawlAllButton />
  </header>
);

const ColumnLabels = () => (
  <div role="row" style={{ ...ROW, borderTop: 'none', padding: '12px 0' }}>
    {COLUMNS.map((column, index) => (
      <div
        key={column}
        role="columnheader"
        style={index === 0 ? FIRST_CELL : CELL}
      >
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
          {COPY.columns[column]}
        </span>
      </div>
    ))}
  </div>
);

/**
 * The whole row opens `?run=` (the detail lands in PR3): the link sits in the
 * WHEN cell, carries the row's name, and its `::after` covers the row, so the
 * row keeps its table role and stays one click target. A night that didn't
 * start has no link (row 14).
 */
const STRETCHED_LINK = "after:absolute after:inset-0 after:content-['']";

const rowParts = (batch: BatchRow) => {
  const when = batchWhen(batch);
  const what = batchLabel(batch);
  const status = batchStatus(batch);
  const summary = batchSummary(batch);
  const time = batchTime(batch);
  const cost = batchCost(batch);
  return {
    when,
    what,
    status,
    summary,
    time,
    cost,
    label: COPY.rowLabel(COPY.whenLabel(when.date, when.time), [
      what,
      status.label,
      summary,
      time,
      cost,
    ]),
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
  const { when, what, status, summary, time, cost, label } = rowParts(batch);
  const whenText = (
    <>
      <span
        style={{ ...NOWRAP, display: 'block', fontSize: 13.5, fontWeight: 600 }}
      >
        {when.date}
      </span>
      <span style={{ ...NOWRAP, ...muted(12), display: 'block', marginTop: 2 }}>
        {when.time}
      </span>
    </>
  );
  return (
    <div
      role="row"
      data-testid="crawl-batch-row"
      aria-label={label}
      style={{
        ...ROW,
        position: 'relative',
        padding: '10px 0',
        color: 'var(--fg)',
      }}
    >
      <div role="cell" style={FIRST_CELL}>
        {isClickableBatch(batch) ? (
          <Link
            href={crawlRunsHref(filter, batch.linkKey)}
            scroll={false}
            aria-label={label}
            className={STRETCHED_LINK}
            style={{
              display: 'block',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            {whenText}
          </Link>
        ) : (
          whenText
        )}
      </div>
      <div role="cell" style={{ ...CELL, ...NOWRAP, ...muted(12.5) }}>
        {what}
      </div>
      <div role="cell" style={CELL}>
        <VenueChip
          tone={status.tone}
          label={status.label}
          testId="batch-chip"
        />
      </div>
      <div role="cell" style={{ ...CELL, ...muted(13) }}>
        {summary}
      </div>
      <div role="cell" style={{ ...CELL, ...NOWRAP, ...muted(12.5) }}>
        {time}
      </div>
      <div role="cell" style={{ ...CELL, ...NOWRAP, ...muted(12.5) }}>
        {cost}
      </div>
    </div>
  );
};

/** `A3/09/runs-filters-m`: the label over the summary; date, time, chip at the right. */
const PhoneRow = ({
  batch,
  filter,
}: {
  batch: BatchRow;
  filter: BatchFilter;
}) => {
  const { when, what, status, summary, label } = rowParts(batch);
  // The whole card opens `?run=` through the title's stretched link, as the
  // desktop row does; a night that didn't start has none.
  return (
    <div
      role="listitem"
      data-testid="crawl-batch-row"
      aria-label={label}
      style={{
        position: 'relative',
        display: 'flex',
        gap: 10,
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
        color: 'var(--fg)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ fontSize: 14.5, fontWeight: 700, overflowWrap: 'anywhere' }}
        >
          {isClickableBatch(batch) ? (
            <Link
              href={crawlRunsHref(filter, batch.linkKey)}
              scroll={false}
              aria-label={label}
              className={STRETCHED_LINK}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {what}
            </Link>
          ) : (
            what
          )}
        </div>
        {summary !== '' && (
          <div style={{ ...muted(12.5), marginTop: 3, lineHeight: 1.4 }}>
            {summary}
          </div>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 5,
          flex: 'none',
        }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{when.date}</span>
        <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>
          {when.time}
        </span>
        <VenueChip
          tone={status.tone}
          label={status.label}
          testId="batch-chip"
        />
      </div>
    </div>
  );
};

/**
 * The table's narrowest width: below it (a narrow desktop pane) the table
 * scrolls sideways rather than crushing the summary.
 */
const TABLE_MIN_WIDTH = 640;

const Scroll = ({ children }: { children: ReactNode }) => (
  <div style={{ overflowX: 'auto' }}>{children}</div>
);

/** The list in its viewport's shape; `footer` is the Load more row. */
export const BatchesTable = ({
  batches,
  filter,
  phone,
  footer,
}: {
  batches: readonly BatchRow[];
  filter: BatchFilter;
  phone: boolean;
  footer: ReactNode;
}) =>
  phone ? (
    <div>
      <div role="list" aria-label={COPY.title} data-testid="crawl-runs-table">
        {batches.map((batch) => (
          <PhoneRow key={batch.key} batch={batch} filter={filter} />
        ))}
      </div>
      {footer}
    </div>
  ) : (
    <Scroll>
      <div
        role="table"
        aria-label={COPY.title}
        data-testid="crawl-runs-table"
        style={{ ...CARD, minWidth: TABLE_MIN_WIDTH }}
      >
        <ColumnLabels />
        {batches.map((batch) => (
          <DesktopRow key={batch.key} batch={batch} filter={filter} />
        ))}
        {footer && (
          <div role="row" style={{ gridColumn: '1 / -1' }}>
            <div role="cell">{footer}</div>
          </div>
        )}
      </div>
    </Scroll>
  );

const SKELETON_ROWS = 6;

/** The phone skeleton's rows (`07/loading-any-list-on-mobile`), no tile. */
const PhoneSkeletonRows = () => (
  <div className={PHONE_ONLY}>
    {Array.from({ length: SKELETON_ROWS }, (_, row) => (
      <div
        key={row}
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 0',
          borderBottom: '1px solid var(--border)',
          opacity: 1 - row * 0.13,
        }}
      >
        <div
          style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}
        >
          <SkeletonBlock
            width={`${55 + ((row * 13) % 30)}%`}
            height={13}
            radius={6}
          />
          <SkeletonBlock width="40%" height={10} radius={6} />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 6,
          }}
        >
          <SkeletonBlock width={48} height={11} radius={6} />
          <SkeletonBlock width={70} height={20} radius={999} />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Loading (`A3/09/loading-runs-d`): the four filter pills, then the real
 * column labels over bar rows; the phone follows
 * `07/loading-any-list-on-mobile` in the card's shape. Both are drawn and CSS
 * picks one, so a route's `loading.tsx` can use it.
 */
export const BatchesSkeleton = ({ filters = true }: { filters?: boolean }) => (
  <div
    data-testid="crawl-runs-skeleton"
    aria-busy="true"
    style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
  >
    {filters && (
      <>
        {/* The flex lives in the class: an inline display would beat the phone's hidden. */}
        <div className={`flex gap-2 ${DESKTOP_ONLY}`}>
          {[50, 74, 80, 76].map((width) => (
            <SkeletonBlock key={width} width={width} height={32} radius={999} />
          ))}
        </div>
        <div className={PHONE_ONLY}>
          <SkeletonBlock height={40} radius={10} />
        </div>
      </>
    )}
    <PhoneSkeletonRows />
    <div className={DESKTOP_ONLY}>
      <Scroll>
        <div aria-hidden style={{ ...CARD, minWidth: TABLE_MIN_WIDTH }}>
          <ColumnLabels />
          {Array.from({ length: SKELETON_ROWS }, (_, row) => (
            <div key={row} style={{ ...ROW, padding: '14px 0' }}>
              <div
                style={{
                  ...FIRST_CELL,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                }}
              >
                <SkeletonBlock width={52} height={12} radius={6} />
                <SkeletonBlock width={40} height={10} radius={6} />
              </div>
              <div style={CELL}>
                <SkeletonBlock width={120} height={12} radius={6} />
              </div>
              <div style={CELL}>
                <SkeletonBlock width={60} height={22} radius={999} />
              </div>
              <div style={CELL}>
                <SkeletonBlock width="80%" height={12} radius={6} />
              </div>
              <div style={CELL}>
                <SkeletonBlock width={36} height={12} radius={6} />
              </div>
              <div style={CELL}>
                <SkeletonBlock width={32} height={12} radius={6} />
              </div>
            </div>
          ))}
        </div>
      </Scroll>
    </div>
  </div>
);
