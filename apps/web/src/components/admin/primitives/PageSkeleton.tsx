import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

export interface PageSkeletonProps {
  /** Tab or segment placeholders above the list. */
  tabs?: number;
  /** Filter chip placeholders. */
  filters?: number;
  /** Columns per row on desktop; rows become cards on the phone. */
  columns?: number;
  rows?: number;
  /** A search box above the filters, as Events and Venues draw it. */
  search?: boolean;
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
  rowHeight,
}: PageSkeletonProps) => (
  <div
    data-testid="page-skeleton"
    aria-busy="true"
    style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
  >
    {search && <SkeletonBlock height={36} radius={12} />}
    {tabs > 0 && (
      <div style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length: tabs }, (_, i) => (
          <SkeletonBlock key={i} width={88} height={30} radius={999} />
        ))}
      </div>
    )}
    {filters > 0 && (
      <div style={{ display: 'flex', gap: 8 }}>
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
      }}
    >
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            height: rowHeight,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <SkeletonBlock width={44} height={44} radius={10} />
          <div
            style={{
              flex: 1,
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
          {Array.from({ length: Math.max(0, columns - 2) }, (_, col) => (
            <SkeletonBlock key={col} width={70} height={20} radius={999} />
          ))}
        </div>
      ))}
    </div>
  </div>
);
