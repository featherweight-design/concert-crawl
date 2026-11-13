import { notFound } from 'next/navigation';
import type { VenueWithCrawlHealth } from '@concert-crawl/types';
import { auth, requireAdminUser } from '@/lib/auth';
import { ApiError, apiClient } from '@/lib/api';
import { InspectClient } from '@/components/admin/inspect/InspectClient';
import { pickInspectPage } from '@/components/admin/inspect/inspect-rules';
import {
  parseRun,
  parseRunPages,
  parseRunRows,
} from '@/components/admin/crawl-runs/run-data';
import {
  RUNS_CAP,
  lastFullRuns,
} from '@/components/admin/crawl-runs/runs-rules';

interface Props {
  params: Promise<{ id: string; runId: string }>;
  searchParams: Promise<{
    page?: string | string[];
    url?: string | string[];
  }>;
}

/**
 * Inspect a fetched page (3b part 5). Loads the venue, the run, its pages and
 * the venue's runs at once. `?page=` picks the page (the run detail's PAGES
 * rows link each one), else `?url=` (Compare keeps the page across runs),
 * else the first that failed, else the first. An unknown venue or run (a 404)
 * or a run of another venue is not found; any other failure of the venue or
 * the run reaches the admin error boundary. The body is fetched on the client.
 */
export default async function InspectPage({ params, searchParams }: Props) {
  await requireAdminUser();
  const { id, runId } = await params;
  const query = await searchParams;
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return null;

  const runPath = `/v1/admin/crawl/runs/${encodeURIComponent(runId)}`;
  const [venue, run, pages, runs] = await Promise.all([
    apiClient.get<VenueWithCrawlHealth>(
      `/v1/admin/venues/${encodeURIComponent(id)}`,
      token,
    ),
    apiClient.get<unknown>(runPath, token).then(parseRun),
    apiClient
      .get<unknown>(`${runPath}/pages`, token)
      .then(parseRunPages)
      .catch((err: unknown) => {
        console.error('InspectPage: could not load the pages', { runId, err });
        return null;
      }),
    // Compare's target: the last `success` before this run, from the same
    // map the Runs tab builds. A run older than the cap has none.
    apiClient
      .get<unknown>(
        `/v1/admin/crawl/runs?venueId=${encodeURIComponent(id)}&limit=${RUNS_CAP}`,
        token,
      )
      .then(parseRunRows)
      .catch((err: unknown) => {
        console.error('InspectPage: could not load the runs', { id, err });
        return null;
      }),
  ]).catch((err: unknown) => {
    console.error('InspectPage: could not load the venue or the run', {
      id,
      runId,
      err,
    });
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });
  if (run === null) throw new Error('InspectPage: unexpected run shape');
  if (run.venueId !== venue.id) notFound();

  return (
    <InspectClient
      venue={{
        id: venue.id,
        name: venue.name,
        websiteUrl: venue.websiteUrl,
        latestRunId: venue.latestRun?.id ?? null,
      }}
      run={run}
      pages={pages}
      page={
        pages === null ? null : pickInspectPage(pages, query.page, query.url)
      }
      compare={runs === null ? null : (lastFullRuns(runs).get(run.id) ?? null)}
    />
  );
}
