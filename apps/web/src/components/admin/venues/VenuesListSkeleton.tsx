import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

/** A loaded row's height, so nothing jumps when the list arrives (adm2 item 29). */
const DESKTOP_ROW = 55;
const PHONE_ROW = 93;
const ROWS = 7;
const NAME_WIDTHS = ['38%', '55%', '42%', '60%', '46%', '52%', '40%'];

/** Rows fade toward the bottom, 12% a row, as `07/loading-venues` draws them. */
const fade = (row: number): number => 1 - row * 0.12;

/**
 * `07/loading-venues` in the list's final shape (rule 9). No hooks, so the
 * route's `loading.tsx` renders it on the server; the phone shape swaps in at
 * the admin breakpoint (720px) through CSS.
 */
export const VenuesListSkeleton = () => (
  <div
    data-testid="venues-skeleton"
    aria-busy="true"
    style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* The phone shell's top bar carries the title. */}
      <span className="max-[720px]:hidden">
        <SkeletonBlock width={200} height={28} radius={8} />
      </span>
      <SkeletonBlock width="min(380px, 80%)" height={12} radius={6} />
    </div>
    <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
      <span style={{ flex: 'none', width: 'min(260px, 100%)' }}>
        <SkeletonBlock height={36} radius={10} />
      </span>
      {[0, 1, 2].map((chip) => (
        <span
          key={chip}
          className="max-[720px]:hidden"
          style={{ flex: 'none' }}
        >
          <SkeletonBlock width={92} height={32} radius={999} />
        </span>
      ))}
    </div>

    <div
      className="max-[720px]:hidden"
      style={{
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '14px 18px' }}>
        <SkeletonBlock width="40%" height={9} radius={6} />
      </div>
      {NAME_WIDTHS.slice(0, ROWS).map((width, row) => (
        <div
          key={row}
          style={{
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            height: DESKTOP_ROW,
            padding: '0 18px',
            borderTop: '1px solid var(--border)',
            opacity: fade(row),
          }}
        >
          <SkeletonBlock width={34} height={34} radius={9} />
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 7,
            }}
          >
            <SkeletonBlock width={width} height={13} radius={6} />
            <SkeletonBlock width="22%" height={9} radius={6} />
          </div>
          <SkeletonBlock width={70} height={20} radius={999} />
          <SkeletonBlock width={82} height={11} radius={6} />
          <SkeletonBlock width={94} height={11} radius={6} />
        </div>
      ))}
    </div>

    <div className="min-[721px]:hidden">
      {NAME_WIDTHS.slice(0, ROWS).map((width, row) => (
        <div
          key={row}
          style={{
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            height: PHONE_ROW,
            borderBottom: '1px solid var(--border)',
            opacity: fade(row),
          }}
        >
          <SkeletonBlock width={40} height={40} radius={10} />
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <SkeletonBlock width={width} height={13} radius={6} />
            <SkeletonBlock width={150} height={20} radius={999} />
            <SkeletonBlock width="50%" height={9} radius={6} />
          </div>
        </div>
      ))}
    </div>
  </div>
);
