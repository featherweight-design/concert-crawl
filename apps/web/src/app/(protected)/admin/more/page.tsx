import { auth, requireAdminUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminMoreList,
  type AdminMoreDetails,
} from '@/components/admin/shell/AdminMoreList';
import { crawlWhen } from '@/components/admin/shell/crawl-when';

/** The Needs you facts' last nightly crawl (its start), the same one All clear shows. */
interface CrawlFacts {
  lastCrawl: { at: string } | null;
}

interface ReviewCounts {
  prices: number;
}

/** The Artists To check tab's own count (the API still zeroes the old fields). */
interface ArtistCounts {
  to_check: number;
}

const settledValue = <T,>(result: PromiseSettledResult<T>): T | null =>
  result.status === 'fulfilled' ? result.value : null;

const EMPTY: AdminMoreDetails = {
  artistsToCheck: null,
  missingPrices: null,
  featureFlags: null,
  feedbackToRead: null,
  // "Last run" is the latest daily crawl's START (#178 item 29), read from the
  // Needs you facts. Unknown draws no detail line rather than a guess.
  lastCrawl: null,
};

/**
 * The phone's More tab (`07/more-mobile`, without the pills per #178 item 7).
 * It renders at every width, and desktop simply has no link to it. Each count
 * is best effort: a failed or zero count falls back to the row's description.
 */
export default async function AdminMorePage() {
  await requireAdminUser();
  const { getToken } = await auth();
  const token = await getToken();

  let data = EMPTY;
  if (token) {
    const [review, feedback, artists, flags, facts] = await Promise.allSettled([
      apiClient.get<ReviewCounts>('/v1/admin/review/counts', token),
      apiClient.get<{ unread: number }>('/v1/admin/feedback/counts', token),
      apiClient.get<ArtistCounts>('/v1/admin/artists/counts', token),
      apiClient.get<unknown[]>('/v1/admin/feature-flags', token),
      apiClient.get<CrawlFacts>('/v1/admin/needs-you/facts', token),
    ]);
    const artistCounts = settledValue(artists);
    const lastCrawlAt = settledValue(facts)?.lastCrawl?.at ?? null;
    data = {
      ...EMPTY,
      // The Artists To check tab, the same number the tab itself shows.
      artistsToCheck: artistCounts?.to_check ?? null,
      missingPrices: settledValue(review)?.prices ?? null,
      featureFlags: settledValue(flags)?.length ?? null,
      feedbackToRead: settledValue(feedback)?.unread ?? null,
      lastCrawl: lastCrawlAt ? crawlWhen(lastCrawlAt, new Date()) : null,
    };
  }

  return (
    <>
      <h1 className="sr-only">{ADMIN_COPY.shell.more.title}</h1>
      <AdminMoreList data={data} />
    </>
  );
}
