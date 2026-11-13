import { auth, requireAdminUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import type { VenueGuide, VenueWithCrawlHealth } from '@concert-crawl/types';
import { VenueDetailsClient } from '@/components/admin/VenueDetailsClient';
import { notFound } from 'next/navigation';
import { parseVenueRun, parseVenueTab } from '@/lib/admin/venue-tabs';
import {
  parseOverviewNeedsYou,
  parseOverviewRuns,
  parseOverviewSnoozes,
} from '@/components/admin/venues/overview/overview-data';
import { LAST_RUNS } from '@/components/admin/venues/overview/overview-rules';
import { parseRunRows } from '@/components/admin/crawl-runs/run-data';
import { RUNS_STEP } from '@/components/admin/crawl-runs/runs-rules';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string | string[];
    run?: string | string[];
  }>;
}

/**
 * One runs fetch feeds both tabs: Overview's last 14 and the Runs tab's first
 * page. Null when the body isn't a list (each tab's Couldn't load).
 */
const parseBothRuns = (raw: unknown) => {
  const overview = parseOverviewRuns(raw);
  const tab = parseRunRows(raw);
  return overview === null || tab === null ? null : { overview, tab };
};

const EMPTY_GUIDE: VenueGuide = {
  chips: [],
  insiderTip: null,
  publishedAt: null,
};

export default async function VenueDetailPage({ params, searchParams }: Props) {
  await requireAdminUser();
  const { id } = await params;
  const query = await searchParams;
  const tab = parseVenueTab(query.tab);
  // `?run=` opens a run's detail, on the Runs tab only.
  const initialRun = tab === 'runs' ? parseVenueRun(query.run) : null;
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
  const [guide, bothRuns, needsYou, snoozes] = await Promise.all([
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
      `/v1/admin/crawl/runs?${venueQuery}&limit=${Math.max(LAST_RUNS, RUNS_STEP)}`,
      parseBothRuns,
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
      overview={{ runs: bothRuns?.overview ?? null, needsYou, snoozes }}
      runs={{ runs: bothRuns?.tab ?? null, initialRun }}
    />
  );
}
