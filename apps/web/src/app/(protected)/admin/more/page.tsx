import { auth, requireAdminUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminMoreList,
  type AdminMoreDetails,
} from '@/components/admin/shell/AdminMoreList';

interface CrawlStatusVenue {
  blockedAt: string | null;
  lastRun: { status: string; createdAt: string } | null;
}

interface ReviewCounts {
  prices: number;
}

const settledValue = <T,>(result: PromiseSettledResult<T>): T | null =>
  result.status === 'fulfilled' ? result.value : null;

const mountainTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Denver',
  hour: 'numeric',
  minute: '2-digit',
});

const lastCrawlAt = (venues: CrawlStatusVenue[]): string | null => {
  const times = venues
    .map((venue) => venue.lastRun?.createdAt)
    .filter((value): value is string => typeof value === 'string')
    .map((value) => Date.parse(value))
    .filter((value) => !Number.isNaN(value));
  return times.length === 0 ? null : mountainTime.format(Math.max(...times));
};

const isFailing = (venue: CrawlStatusVenue): boolean =>
  venue.blockedAt !== null || venue.lastRun?.status === 'failed';

const EMPTY: AdminMoreDetails = {
  failingVenues: null,
  artistsToCheck: null,
  missingPrices: null,
  featureFlags: null,
  feedbackToRead: null,
  lastCrawlAt: null,
};

/**
 * The phone's More tab (`07/more-mobile`). It renders at every width, and
 * desktop simply has no link to it. Each detail is best effort: a failed
 * count falls back to the row's plain description.
 */
export default async function AdminMorePage() {
  await requireAdminUser();
  const { getToken } = await auth();
  const token = await getToken();

  let data = EMPTY;
  if (token) {
    const [status, review, feedback, reported, flags] =
      await Promise.allSettled([
        apiClient.get<CrawlStatusVenue[]>('/v1/admin/crawl/status', token),
        apiClient.get<ReviewCounts>('/v1/admin/review/counts', token),
        apiClient.get<{ unread: number }>('/v1/admin/feedback/counts', token),
        apiClient.get<{ count: number }>(
          '/v1/admin/artists/reports/count',
          token,
        ),
        apiClient.get<unknown[]>('/v1/admin/feature-flags', token),
      ]);
    const venues = settledValue(status);
    data = {
      failingVenues: venues ? venues.filter(isFailing).length : null,
      artistsToCheck: settledValue(reported)?.count ?? null,
      missingPrices: settledValue(review)?.prices ?? null,
      featureFlags: settledValue(flags)?.length ?? null,
      feedbackToRead: settledValue(feedback)?.unread ?? null,
      lastCrawlAt: venues ? lastCrawlAt(venues) : null,
    };
  }

  return (
    <>
      <h1 className="sr-only">{ADMIN_COPY.shell.more.title}</h1>
      <AdminMoreList data={data} />
    </>
  );
}
