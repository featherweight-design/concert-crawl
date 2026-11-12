import type { PausedVenue } from '@/components/admin/venues/pause-rules';

export interface CrawlPauseControlProps {
  venue: PausedVenue & { id: string; name: string };
  /** The shows that stay listed, for the panel's "Its {N} shows stay listed." */
  showCount: number;
}
