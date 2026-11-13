import type { NeedsYouCount } from '@concert-crawl/types';
import { apiClient } from '@/lib/api';

/**
 * The one Needs you number: the queue's own decision count. The sidebar badge
 * (layout) and the Health summary and button (page) both read it here, so they
 * cannot disagree. Rejects when the API fails; callers degrade their own part.
 */
export const fetchNeedsYouDecisions = async (
  token: string,
): Promise<number> => {
  const count = await apiClient.get<NeedsYouCount>(
    '/v1/admin/needs-you/count',
    token,
  );
  return count.decisions;
};
