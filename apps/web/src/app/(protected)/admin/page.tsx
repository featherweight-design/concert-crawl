import { auth, requireAdminUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import type {
  AdminDailyCosts,
  AdminEmailDelivery,
  AdminSettings,
  Venue,
} from '@concert-crawl/types';
import { fetchNeedsYouDecisions } from '@/components/admin/shell/needs-you-count';
import { navItem } from '@/components/admin/shell/nav';
import {
  HealthHeader,
  HealthTiles,
} from '@/components/admin/health/HealthTiles';
import { VenueGrid } from '@/components/admin/health/VenueGrid';
import { CostByDay } from '@/components/admin/health/CostByDay';
import {
  artistsTile,
  costTile,
  groupVenues,
  lastNightWindow,
  monthSeries,
  monthToDate,
  summarizeCrawl,
  type ArtistCounts,
  type HealthStatusRow,
} from '@/components/admin/health/health-model';

/**
 * Health (admin 1c-2): `03/health-desktop` and `03/health-mobile`. The tiles'
 * data is the page: when any of it fails, the page throws to `error.tsx`'s
 * Couldn't load. The Needs you count only degrades its own part. The old
 * "Needs attention" triage block is not drawn by either board, so it is not
 * rendered here: Needs you and the venue grid carry that information.
 * 1c-3 adds the budget panel, Done for you, Artist sync and The site panels.
 */
export default async function AdminHealthPage() {
  await requireAdminUser();
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return null;

  const now = new Date();
  const month = monthToDate(now);
  // Names the endpoint, so error.tsx and Sentry say which load broke the page.
  const load = <T,>(path: string) =>
    apiClient.get<T>(path, token).catch((err: unknown) => {
      console.error(`[admin] Health failed to load ${path}:`, err);
      throw new Error(`Failed to load ${path}`, { cause: err });
    });

  const [status, venues, costs, settings, artists, delivery, needsYou] =
    await Promise.all([
      load<HealthStatusRow[]>('/v1/admin/crawl/status'),
      load<Venue[]>('/v1/admin/venues'),
      // The month to date: the window ends today (MT), so N days is the 1st on.
      load<AdminDailyCosts>(`/v1/admin/costs/daily?days=${month.dayOfMonth}`),
      load<AdminSettings>('/v1/admin/settings'),
      load<ArtistCounts>('/v1/admin/artists/counts'),
      load<AdminEmailDelivery>('/v1/admin/notifications/delivery'),
      // One count for the summary and the button (G11), so they never disagree.
      fetchNeedsYouDecisions(token).catch((err: unknown) => {
        console.error('[admin] failed to load the Needs you count:', err);
        return null;
      }),
    ]);

  const lastNight = lastNightWindow(now);
  const budgetUsd = settings.llmMonthlyBudgetUsd;
  // Summed from this month's own days, not `costs.totalUsd`: if the API's
  // "today" has crossed midnight into the next month, its window drops the
  // 1st and adds a day of next month, and the total would carry both.
  const series = monthSeries(costs.days, month);
  const mtdUsd = series.reduce((sum, day) => sum + (day.costUsd ?? 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <HealthHeader needsYou={needsYou} href={navItem('needs-you').href} />
      <HealthTiles
        crawl={summarizeCrawl(status, lastNight)}
        artists={artistsTile(artists)}
        cost={{
          month: month.month,
          mtdUsd,
          budgetUsd,
          ...costTile(mtdUsd, budgetUsd, month),
        }}
        delivery={delivery}
      />
      <div className="health-columns">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <VenueGrid
            groups={groupVenues(status, venues, lastNight)}
            crawlRunsHref={navItem('crawl-runs').href}
          />
          <CostByDay
            series={series}
            month={month.month}
            budgetUsd={budgetUsd}
          />
        </div>
        {/* 1c-3: Artist sync and The site, desktop only (gap G12). */}
      </div>
    </div>
  );
}
