import { requireAdminUser } from '@/lib/auth';
import { AddVenueFlow } from '@/components/admin/add-venue/AddVenueFlow';

/**
 * Add a venue (3e, `05-add-a-venue`). It opens on Start; resuming a draft
 * from `?id` comes with the draft save in 3e-1c-ii (plan decision 2).
 */
export default async function AddVenuePage() {
  await requireAdminUser();
  return <AddVenueFlow />;
}
