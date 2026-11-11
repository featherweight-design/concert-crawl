import { StatusBadge } from '@/components/admin/primitives';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.crawlPausedBadge;

interface CrawlPausedBadgeProps {
  /** `venues.crawl_paused_at`. Renders nothing while the venue is crawling. */
  crawlPausedAt: string | null;
}

/**
 * Marks a venue whose crawling is paused (`crawl_paused_at`) while its shows
 * stay published. One component for the venue list and the venue detail
 * header, so the two always say the same thing.
 */
export const CrawlPausedBadge = ({ crawlPausedAt }: CrawlPausedBadgeProps) => {
  if (crawlPausedAt === null) return null;
  return (
    <StatusBadge kind="warning" variant="outline">
      {COPY.label}
    </StatusBadge>
  );
};
