import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

export interface PageSkeletonProps {
  /** Tab or segment placeholders above the list. */
  tabs?: number;
  /** Filter chip placeholders. */
  filters?: number;
  /** Columns per row on desktop; rows become cards on the phone. */
  columns?: number;
  rows?: number;
  /** A search box above the filters, as Venues draws it. */
  search?: boolean;
  /**
   * The search box at the start of the filter row instead of above it, as
   * `07/loading-events` draws it.
   */
  inlineSearch?: boolean;
  /** The page's title and subtitle bars, for a page whose client draws them. */
  heading?: boolean;
  /**
   * The rows inside a table card with its header bar, and a status pill and
   * value bars on each row, as `07/loading-events` draws them.
   */
  card?: boolean;
  /** The loaded row's height on this page, so nothing jumps (#178 item 29). */
  rowHeight: number;
}

/**
 * Values `07/loading-any-list-on-mobile` draws differently from the desktop
 * boards. Each is a var holding the desktop value as its fallback; admin.css
 * `.page-skeleton-plain` sets the phone value at the breakpoint, so the
 * server fallback needs no viewport hook. Plain rows only: card mode keeps
 * the desktop values everywhere.
 */
export const PHONE_VAR = {
  /** Search box radius: desktop 12, phone 10. */
  searchRadius: 'var(--page-skeleton-search-radius, 12px)',
  /** Filter pill height: desktop 31, phone 32. */
  pillHeight: 'var(--page-skeleton-pill-height, 31px)',
  /** Row title bar height: desktop 12, phone 13. */
  titleHeight: 'var(--page-skeleton-title-height, 12px)',
  /** Row second bar width: desktop 35%, phone 40%. */
  subWidth: 'var(--page-skeleton-sub-width, 35%)',
  /** Row second bar radius: desktop 5, phone 6. */
  subRadius: 'var(--page-skeleton-sub-radius, 5px)',
  /** Gap between the row's two bars: desktop 8, phone 7. */
  barGap: 'var(--page-skeleton-bar-gap, 8px)',
} as const;

/**
 * The loading boards step each row's opacity down by .12 from 1 (1, .88, .76,
 * .64, .52, .40), not a smooth mask. The boards stop at six rows, so a seventh
 * and later hold at .40 rather than going on to fade out.
 */
export const rowOpacity = (row: number): number =>
  Math.max(0.4, Math.round((1 - row * 0.12) * 100) / 100);

/**
 * Loading in the page's final shape (rule 9): the same tabs, filters and rows,
 * stepping down in opacity toward the bottom. The sweep comes from `SkeletonBlock`, which the
 * global reduced-motion rule already stills. No hooks, so a route's
 * `loading.tsx` can render it on the server.
 */
export const PageSkeleton = ({
  tabs = 0,
  filters = 0,
  columns = 3,
  rows = 7,
  search = false,
  inlineSearch = false,
  heading = false,
  card = false,
  rowHeight,
}: PageSkeletonProps) => (
  <div
    data-testid="page-skeleton"
    // The phone values cover plain rows only: the card table (Events) isn't
    // what `07/loading-any-list-on-mobile` draws.
    className={card ? undefined : 'page-skeleton-plain'}
    role="status"
    aria-busy="true"
    style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
  >
    <span className="sr-only">{ADMIN_COPY.states.loading}</span>
    {heading && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SkeletonBlock width={200} height={28} radius={8} />
        <SkeletonBlock width="min(380px, 80%)" height={12} radius={6} />
      </div>
    )}
    {search && !inlineSearch && (
      <SkeletonBlock height={36} radius={PHONE_VAR.searchRadius} />
    )}
    {inlineSearch && filters === 0 && (
      <SkeletonBlock
        width="min(260px, 100%)"
        height={36}
        radius={PHONE_VAR.searchRadius}
      />
    )}
    {tabs > 0 && (
      <div style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length: tabs }, (_, i) => (
          <SkeletonBlock key={i} width={88} height={30} radius={999} />
        ))}
      </div>
    )}
    {filters > 0 && (
      <div
        style={{
          display: 'flex',
          gap: 8,
          ...(inlineSearch && { flexWrap: 'wrap' }),
        }}
      >
        {inlineSearch && (
          <SkeletonBlock
            width="min(260px, 100%)"
            height={36}
            radius={PHONE_VAR.searchRadius}
          />
        )}
        {Array.from({ length: filters }, (_, i) => (
          <SkeletonBlock
            key={i}
            width={i === 0 ? 90 : 80}
            height={PHONE_VAR.pillHeight}
            radius={999}
          />
        ))}
      </div>
    )}
    <div
      style={{
        ...(card && {
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--surface-1)',
          overflow: 'hidden',
        }),
      }}
    >
      {card && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 38,
            padding: '0 18px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <SkeletonBlock width="min(380px, 60%)" height={8} radius={4} />
        </div>
      )}
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            height: rowHeight,
            borderBottom: '1px solid var(--border)',
            opacity: rowOpacity(row),
            ...(card && { padding: '0 18px' }),
          }}
        >
          <SkeletonBlock width={44} height={44} radius={10} />
          <div
            style={{
              flex: card ? '1 0 40%' : 1,
              display: 'flex',
              flexDirection: 'column',
              gap: PHONE_VAR.barGap,
            }}
          >
            <SkeletonBlock
              width={`${55 + ((row * 13) % 30)}%`}
              height={PHONE_VAR.titleHeight}
              radius={6}
            />
            <SkeletonBlock
              width={PHONE_VAR.subWidth}
              height={10}
              radius={PHONE_VAR.subRadius}
            />
          </div>
          {card ? (
            // A status pill and short value bars, as the table boards draw.
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flex: '0 1 auto',
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              <SkeletonBlock width={70} height={20} radius={999} />
              {Array.from({ length: Math.max(0, columns - 3) }, (_, col) => (
                <SkeletonBlock key={col} width={80} height={9} radius={5} />
              ))}
            </div>
          ) : (
            columns > 2 && (
              <>
                <div
                  data-testid="page-skeleton-tail-desktop"
                  className="page-skeleton-tail-desktop"
                  // `display` lives in admin.css so the breakpoint can hide it.
                  style={{ alignItems: 'center', gap: 12 }}
                >
                  {Array.from({ length: columns - 2 }, (_, col) => (
                    <SkeletonBlock
                      key={col}
                      width={70}
                      height={20}
                      radius={999}
                    />
                  ))}
                </div>
                {/* `07/loading-any-list-on-mobile`: a 48 × 11 bar over one
                    70 × 20 pill, right-aligned, 6 apart. */}
                <div
                  data-testid="page-skeleton-tail-phone"
                  className="page-skeleton-tail-phone"
                  style={{
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 6,
                    flex: 'none',
                  }}
                >
                  <SkeletonBlock width={48} height={11} radius={6} />
                  <SkeletonBlock width={70} height={20} radius={999} />
                </div>
              </>
            )
          )}
        </div>
      ))}
    </div>
  </div>
);
