import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';
import { InviteCodesRowsSkeleton } from '../invite-codes/InviteCodesSkeleton';

/** `07/loading-people`'s two trailing column bars. */
const PEOPLE_TAIL = [82, 94] as const;

/** The list's loading rows: avatar, handle, role chip, two columns. */
export const PeopleRowsSkeleton = () => (
  <InviteCodesRowsSkeleton avatar tail={PEOPLE_TAIL} />
);

/** Title bar widths per row, as `07/loading-any-list-on-mobile` draws them. */
const PHONE_ROW_WIDTHS = ['55%', '68%', '81%', '64%', '77%', '60%', '73%'];
/** The phone chip bars, `07/loading-any-list-on-mobile`. */
const PHONE_CHIPS = [90, 80, 80] as const;

/**
 * The phone list's loading rows (`07/loading-any-list-on-mobile`): a 44px
 * tile, a title and a sub, then a short bar over a pill on the right, each
 * row 13% fainter than the last.
 */
export const PeoplePhoneRowsSkeleton = () => (
  <div data-testid="people-phone-skeleton" aria-busy="true">
    {PHONE_ROW_WIDTHS.map((width, row) => (
      <div
        key={width}
        data-testid="people-phone-skeleton-row"
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 0',
          borderBottom: '1px solid var(--border)',
          opacity: 1 - row * 0.13,
        }}
      >
        <span style={{ flex: 'none' }}>
          <SkeletonBlock width={44} height={44} radius={10} />
        </span>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
          }}
        >
          <SkeletonBlock width={width} height={13} radius={6} />
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
 * `07/loading-people`: title, sub, three tabs, the search and four chips,
 * then the rows. Below the admin breakpoint (720px) the search, chips and
 * rows take `07/loading-any-list-on-mobile`'s shape, swapped in through CSS.
 * No hooks, so the route's `loading.tsx` renders it.
 */
export const PeopleSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SkeletonBlock width={200} height={28} radius={8} />
      <SkeletonBlock width="min(380px, 100%)" height={12} radius={6} />
    </div>
    <div
      style={{
        display: 'flex',
        gap: 18,
        paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
      }}
    >
      {[0, 1, 2].map((tab) => (
        <SkeletonBlock key={tab} width={90} height={14} radius={6} />
      ))}
    </div>
    {/* `display` lives in the class, never inline: an inline value beats the
        breakpoint's `hidden` and both skeletons would draw. */}
    <div
      data-testid="people-desktop-skeleton-bar"
      className="flex max-[720px]:hidden"
      style={{ gap: 8, overflow: 'hidden' }}
    >
      <span style={{ flex: '0 1 260px', minWidth: 0 }}>
        <SkeletonBlock height={36} radius={10} />
      </span>
      {[0, 1, 2, 3].map((chip) => (
        <span key={chip} style={{ flex: 'none' }}>
          <SkeletonBlock width={92} height={32} radius={999} />
        </span>
      ))}
    </div>
    <div className="max-[720px]:hidden">
      <PeopleRowsSkeleton />
    </div>
    <div
      data-testid="people-phone-skeleton-wrap"
      className="flex min-[721px]:hidden"
      style={{ flexDirection: 'column' }}
    >
      <div style={{ paddingBottom: 10 }}>
        <SkeletonBlock height={36} radius={10} />
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          paddingBottom: 6,
          overflow: 'hidden',
        }}
      >
        {PHONE_CHIPS.map((width, chip) => (
          <span key={chip} style={{ flex: 'none' }}>
            <SkeletonBlock width={width} height={32} radius={999} />
          </span>
        ))}
      </div>
      <PeoplePhoneRowsSkeleton />
    </div>
  </div>
);
