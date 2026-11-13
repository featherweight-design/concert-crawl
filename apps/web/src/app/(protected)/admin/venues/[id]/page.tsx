import { auth, requireAdminUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import type { VenueGuide, VenueWithCrawlHealth } from '@concert-crawl/types';
import { VenueDetailsClient } from '@/components/admin/VenueDetailsClient';
import { notFound } from 'next/navigation';
import { parseVenueTab } from '@/lib/admin/venue-tabs';
import {
  parseOverviewNeedsYou,
  parseOverviewRuns,
  parseOverviewSnoozes,
} from '@/components/admin/venues/overview/overview-data';
import { LAST_RUNS } from '@/components/admin/venues/overview/overview-rules';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}

const EMPTY_GUIDE: VenueGuide = {
  chips: [],
  insiderTip: null,
  publishedAt: null,
};

export default async function VenueDetailPage({ params, searchParams }: Props) {
  await requireAdminUser();
  const { id } = await params;
  const tab = parseVenueTab((await searchParams).tab);
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return null;

  let venue: VenueWithCrawlHealth;
  try {
    venue = await apiClient.get<VenueWithCrawlHealth>(
      `/v1/admin/venues/${id}`,
      token,
    );
  } catch {
    notFound();
  }

  /**
   * One of the Overview's own fetches. A failure, or a body that doesn't hold
   * to the shape its card reads, is null: Couldn't load in that card only.
   */
  const overviewFetch = <T,>(
    what: string,
    path: string,
    parse: (raw: unknown) => T | null,
  ): Promise<T | null> =>
    apiClient
      .get<unknown>(path, token)
      .then((raw) => {
        const parsed = parse(raw);
        if (parsed === null) {
          console.error(`VenueDetailPage: ${what}: unexpected shape`, { id });
        }
        return parsed;
      })
      .catch((err: unknown) => {
        console.error(`VenueDetailPage: could not load ${what}`, { id, err });
        return null;
      });
  const venueQuery = `venueId=${encodeURIComponent(id)}`;

  // #764 — a guide fetch failure must not take down the whole venue page. It
  // MUST, however, disable authoring: the empty fallback is indistinguishable
  // from a genuinely empty guide, and saving it would send `chips: []`, which
  // the PUT handler treats as "delete every chip for this venue".
  let guideLoadFailed = false;
  const [guide, runs, needsYou, snoozes] = await Promise.all([
    apiClient
      .get<VenueGuide>(`/v1/admin/venues/${id}/guide`, token)
      .catch((err: unknown) => {
        guideLoadFailed = true;
        console.error('VenueDetailPage: could not load the first-timer guide', {
          id,
          err,
        });
        return EMPTY_GUIDE;
      }),
    overviewFetch(
      'runs',
      `/v1/admin/crawl/runs?${venueQuery}&limit=${LAST_RUNS}`,
      parseOverviewRuns,
    ),
    overviewFetch(
      'needs-you',
      `/v1/admin/needs-you?${venueQuery}`,
      parseOverviewNeedsYou,
    ),
    overviewFetch(
      'snoozes',
      `/v1/admin/needs-you/snoozes?${venueQuery}`,
      parseOverviewSnoozes,
    ),
  ]);

  return (
    <VenueDetailsClient
      venue={venue}
      guide={guide}
      guideLoadFailed={guideLoadFailed}
      initialTab={tab}
      overview={{ runs, needsYou, snoozes }}
    />
  );
}
