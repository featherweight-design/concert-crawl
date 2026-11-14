import { requireAdminUser } from '@/lib/auth';
import { EventsClient } from '@/components/admin/events/list/EventsClient';

/**
 * 4b-1 Events. The list loads in the browser with the admin's token; its
 * search and side live in the URL (`?q=&when=past`).
 */
export default async function AdminEventsPage() {
  await requireAdminUser();
  return <EventsClient />;
}
