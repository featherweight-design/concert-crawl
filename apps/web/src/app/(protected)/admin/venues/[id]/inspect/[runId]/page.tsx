import { notFound } from 'next/navigation';
import type { VenueWithCrawlHealth } from '@concert-crawl/types';
import { auth, requireAdminUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { InspectClient } from '@/components/admin/inspect/InspectClient';
import { pickInspectPage } from '@/components/admin/inspect/inspect-rules';
import {
  parseRun,
  parseRunPages,
  parseRunRows,
  type InspectRun,
} from '@/components/admin/crawl-runs/run-data';
import {
  RUNS_CAP,
  lastFullRuns,
} from '@/components/admin/crawl-runs/runs-rules';

interface Props {
  params: Promise<{ id: string; runId: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}

/**
 * Inspect a fetched page (3b part 5). Loads the venue, the run and its pages;
 * `?page=` picks the page, else the first that failed, else the first. An
 * unknown venue or run, or a run of another venue, is not found. The body is
 * fetched on the client.
 */
export default async function InspectPage({ params, searchParams }: Props) {
  await requireAdminUser();
  const { id, runId } = await params;
  const query = await searchParams;
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return null;

  let venue: VenueWithCrawlHealth;
  let run: InspectRun | null;
  try {
    [venue, run] = await Promise.all([
      apiClient.get<VenueWithCrawlHealth>(
        `/v1/admin/venues/${encodeURIComponent(id)}`,
        token,
      ),
      apiClient
        .get<unknown>(
          `/v1/admin/crawl/runs/${encodeURIComponent(runId)}`,
          token,
        )
        .then(parseRun),
    ]);
  } catch {
    notFound();
  }
  if (run === null || run.venueId !== venue.id) notFound();

  const venueQuery = `venueId=${encodeURIComponent(venue.id)}`;
  const [pages, runs] = await Promise.all([
    apiClient
      .get<unknown>(
        `/v1/admin/crawl/runs/${encodeURIComponent(runId)}/pages`,
        token,
      )
      .then(parseRunPages)
      .catch((err: unknown) => {
        console.error('InspectPage: could not load the pages', { runId, err });
        return null;
      }),
    // Compare's target: the last `success` before this run, from the same
    // map the Runs tab builds. A run older than the cap has none.
    apiClient
      .get<unknown>(
        `/v1/admin/crawl/runs?${venueQuery}&limit=${RUNS_CAP}`,
        token,
      )
      .then(parseRunRows)
      .catch((err: unknown) => {
        console.error('InspectPage: could not load the runs', { id, err });
        return null;
      }),
  ]);

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
      page={pages === null ? null : pickInspectPage(pages, query.page)}
      compare={runs === null ? null : (lastFullRuns(runs).get(run.id) ?? null)}
    />
  );
}
