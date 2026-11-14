import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';
import { VENUE_TABS } from '@/lib/admin/venue-tabs';
import {
  CONTENT_GUTTER_Y,
  PAGE_MAX_WIDTH,
  VENUE_PAGE_GAP,
} from '@/components/admin/shell/content-pane';

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

/**
 * The venue page loading (07/loading-venue-page): the header block, the
 * name and its line, the tab strip, and two cards.
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
      <SkeletonBlock height={150} radius={16} />
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
