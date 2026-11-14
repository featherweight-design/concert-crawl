import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';
import { VENUE_TABS } from '@/lib/admin/venue-tabs';
import {
  CONTENT_GUTTER_Y,
  PAGE_MAX_WIDTH,
  VENUE_PAGE_GAP,
} from '@/components/admin/shell/content-pane';
import { UNDERLINE_TAB_HEIGHT } from '@/components/admin/primitives/geometry';
import {
  VENUE_HEADER_HEIGHT,
  VENUE_HEADER_TILE,
} from '@/components/admin/venues/venue-header-geometry';

const CARD_LINES = ['90%', '76%', '62%', '48%'];

/** A card skeleton: a heading and four lines, as the board draws it. */
const CardSkeleton = () => (
  <div
    style={{
      // Side by side on desktop; under ~656px of content they stack.
      flex: '1 1 320px',
      minWidth: 0,
      minHeight: 160,
      boxSizing: 'border-box',
      borderRadius: 14,
      border: '1px solid var(--border)',
      background: 'var(--bg-elevated)',
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}
  >
    <SkeletonBlock width={120} height={15} radius={6} />
    {CARD_LINES.map((width) => (
      <SkeletonBlock key={width} width={width} height={11} radius={6} />
    ))}
  </div>
);

type Form = 'desktop' | 'phone';

/**
 * The header at the loaded `VenueHeader`'s height (67 desktop, 129.75
 * phone): the tile, then the name and its line. Both forms render; the
 * stylesheet shows the one for the viewport, so no inline `display` here.
 */
const HeaderSkeleton = ({ form }: { form: Form }) => (
  <div
    className={`venue-header-skeleton-${form}`}
    data-testid={`venue-header-skeleton-${form}`}
    style={{ height: VENUE_HEADER_HEIGHT[form] }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <SkeletonBlock
        width={VENUE_HEADER_TILE[form]}
        height={VENUE_HEADER_TILE[form]}
        radius={15}
      />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <SkeletonBlock width={200} height={28} radius={8} />
        <SkeletonBlock width="min(380px, 100%)" height={12} radius={6} />
      </div>
    </div>
  </div>
);

/**
 * The venue page loading (07/loading-venue-page): the name and its line, the
 * tab strip, and two cards. The board's 150px block above the name is not
 * drawn: no loaded venue board (`04/venue-overview` and the rest) has it, and
 * the skeleton keeps the loaded page's geometry so nothing jumps (rule 9).
 */
export default function VenueDetailLoading() {
  return (
    <div
      data-testid="venue-page-skeleton"
      aria-busy="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        // The loaded page's column (`VenueDetailsClient`): its 18 gap, width
        // cap and bottom gutter, so the header and tabs don't jump on load.
        gap: VENUE_PAGE_GAP,
        maxWidth: PAGE_MAX_WIDTH,
        paddingBottom: CONTENT_GUTTER_Y,
      }}
    >
      <HeaderSkeleton form="desktop" />
      <HeaderSkeleton form="phone" />
      <div
        data-testid="venue-tabs-skeleton"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          // The loaded strip: 40px tabs over its 1px border.
          height: UNDERLINE_TAB_HEIGHT + 1,
          boxSizing: 'border-box',
          borderBottom: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        {VENUE_TABS.map((key) => (
          <span key={key} style={{ flex: 'none' }}>
            <SkeletonBlock width={90} height={14} radius={6} />
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
