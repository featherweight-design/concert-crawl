import type { NeedsYouItem } from '@concert-crawl/types';
import { auth, requireAdminUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { VenuesList } from '@/components/admin/venues/VenuesList';
import type { VenueListRow } from '@/components/admin/venues/venue-list-rules';

export default async function AdminVenuesPage() {
  await requireAdminUser();
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return null;

  // A failed load renders "Couldn't load Venues" in the list, not the
  // generic boundary, so Try again re-runs only this fetch. The Needs you
  // list only adds the dots and the "Needs a look" chip, so its failure is
  // not the page's: the list renders without them.
  const [venues, needsYou] = await Promise.all([
    apiClient
      .get<VenueListRow[]>('/v1/admin/venues', token)
      .catch((err: unknown) => {
        console.error('[admin/venues] list failed:', err);
        return null;
      }),
    apiClient
      .get<NeedsYouItem[]>('/v1/admin/needs-you', token)
      .catch((err: unknown) => {
        console.error('[admin/venues] needs-you failed:', err);
        return null;
      }),
  ]);

  return <VenuesList venues={venues} needsYou={needsYou} />;
}
