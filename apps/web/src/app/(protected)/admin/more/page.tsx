import { auth, requireAdminUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminMoreList,
  type AdminMoreDetails,
} from '@/components/admin/shell/AdminMoreList';

interface ReviewCounts {
  prices: number;
}

interface ArtistCounts {
  unmatched: number;
  ambiguous: number;
}

const settledValue = <T,>(result: PromiseSettledResult<T>): T | null =>
  result.status === 'fulfilled' ? result.value : null;

const EMPTY: AdminMoreDetails = {
  artistsToCheck: null,
  missingPrices: null,
  featureFlags: null,
  feedbackToRead: null,
  // "Last run" is the latest daily crawl's START (#178 item 29). Nothing on
  // main records a run's start yet; 1d's batches API does. Until then the
  // row shows no detail line rather than an end time dressed as a start.
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
    const [review, feedback, artists, flags] = await Promise.allSettled([
      apiClient.get<ReviewCounts>('/v1/admin/review/counts', token),
      apiClient.get<{ unread: number }>('/v1/admin/feedback/counts', token),
      apiClient.get<ArtistCounts>('/v1/admin/artists/counts', token),
      apiClient.get<unknown[]>('/v1/admin/feature-flags', token),
    ]);
    const artistCounts = settledValue(artists);
    data = {
      ...EMPTY,
      // The Artists review list: no Spotify match, or a suspect one.
      artistsToCheck: artistCounts
        ? artistCounts.unmatched + artistCounts.ambiguous
        : null,
      missingPrices: settledValue(review)?.prices ?? null,
      featureFlags: settledValue(flags)?.length ?? null,
      feedbackToRead: settledValue(feedback)?.unread ?? null,
    };
  }

  return (
    <>
      <h1 className="sr-only">{ADMIN_COPY.shell.more.title}</h1>
      <AdminMoreList data={data} />
    </>
  );
}
