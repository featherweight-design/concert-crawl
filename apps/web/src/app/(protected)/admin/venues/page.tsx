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
  // generic boundary, so Try again re-runs only this fetch.
  const venues = await apiClient
    .get<VenueListRow[]>('/v1/admin/venues', token)
    .catch((err: unknown) => {
      console.error('[admin/venues] list failed:', err);
      return null;
    });

  return <VenuesList venues={venues} />;
}
