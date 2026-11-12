import { requireAdminUser } from '@/lib/auth';
import { ArtistsClient } from '@/components/admin/artists/ArtistsClient';

/**
 * 4c Artists. The lists load in the browser with the admin's token, so a
 * write or Try again updates them without a navigation.
 */
export default async function AdminArtistsPage() {
  await requireAdminUser();
  return <ArtistsClient />;
}
