import { auth, requireAdminUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import type {
  AdminDailyCosts,
  AdminEmailDelivery,
  AdminSettings,
  NeedsYouCount,
  Venue,
} from '@concert-crawl/types';
import { TriagePanel, parseTriageResponse } from '@/components/admin/triage';
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
 * Couldn't load. The Needs you count and triage only degrade their own part.
 * 1c-3 adds the budget panel, Done for you, Artist sync and The site panels.
 */
export default async function AdminHealthPage() {
  await requireAdminUser();
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return null;

  const now = new Date();
  const month = monthToDate(now);
  const load = <T,>(path: string) => apiClient.get<T>(path, token);

  const [status, venues, costs, settings, artists, delivery, needsYou, triage] =
    await Promise.all([
      load<HealthStatusRow[]>('/v1/admin/crawl/status'),
      load<Venue[]>('/v1/admin/venues'),
      // The month to date: the window ends today (MT), so N days is the 1st on.
      load<AdminDailyCosts>(`/v1/admin/costs/daily?days=${month.dayOfMonth}`),
      load<AdminSettings>('/v1/admin/settings'),
      load<ArtistCounts>('/v1/admin/artists/counts'),
      load<AdminEmailDelivery>('/v1/admin/notifications/delivery'),
      // One count for the summary and the button (G11), so they never disagree.
      load<NeedsYouCount>('/v1/admin/needs-you/count')
        .then((count) => count.decisions)
        .catch((err: unknown) => {
          console.error('[admin] failed to load the Needs you count:', err);
          return null;
        }),
      // Interim until 2b (decision 20): degrades to its own one-line message.
      load<unknown>('/v1/admin/triage')
        .then(parseTriageResponse)
        .catch((err: unknown) => {
          console.error('[admin] failed to load triage:', err);
          return null;
        }),
    ]);

  const lastNight = lastNightWindow(now);
  const budgetUsd = settings.llmMonthlyBudgetUsd;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <HealthHeader needsYou={needsYou} href={navItem('needs-you').href} />
      <HealthTiles
        crawl={summarizeCrawl(status, lastNight)}
        artists={artistsTile(artists)}
        cost={{
          month: month.month,
          mtdUsd: costs.totalUsd,
          budgetUsd,
          ...costTile(costs.totalUsd, budgetUsd, month),
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
            series={monthSeries(costs.days, month)}
            month={month.month}
            budgetUsd={budgetUsd}
          />
        </div>
        {/* 1c-3: Artist sync and The site, desktop only (gap G12). */}
      </div>
      <TriagePanel data={triage} />
    </div>
  );
}
