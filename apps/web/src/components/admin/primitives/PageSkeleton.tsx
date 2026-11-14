import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

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
 * Loading in the page's final shape (rule 9): the same tabs, filters and rows,
 * fading toward the bottom. The sweep comes from `SkeletonBlock`, which the
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
    aria-busy="true"
    style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
  >
    {heading && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SkeletonBlock width={200} height={28} radius={8} />
        <SkeletonBlock width="min(380px, 80%)" height={12} radius={6} />
      </div>
    )}
    {search && !inlineSearch && <SkeletonBlock height={36} radius={12} />}
    {inlineSearch && filters === 0 && (
      <SkeletonBlock width="min(260px, 100%)" height={36} radius={12} />
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
          <SkeletonBlock width="min(260px, 100%)" height={36} radius={12} />
        )}
        {Array.from({ length: filters }, (_, i) => (
          <SkeletonBlock
            key={i}
            width={i === 0 ? 90 : 80}
            height={31}
            radius={999}
          />
        ))}
      </div>
    )}
    <div
      style={{
        // Rows fade toward the bottom, as every loading board draws them.
        maskImage: 'linear-gradient(to bottom, black 45%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 45%, transparent)',
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
            ...(card && { padding: '0 18px' }),
          }}
        >
          <SkeletonBlock width={44} height={44} radius={10} />
          <div
            style={{
              flex: card ? '1 0 40%' : 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <SkeletonBlock
              width={`${55 + ((row * 13) % 30)}%`}
              height={12}
              radius={6}
            />
            <SkeletonBlock width="35%" height={10} radius={5} />
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
            Array.from({ length: Math.max(0, columns - 2) }, (_, col) => (
              <SkeletonBlock key={col} width={70} height={20} radius={999} />
            ))
          )}
        </div>
      ))}
    </div>
  </div>
);
