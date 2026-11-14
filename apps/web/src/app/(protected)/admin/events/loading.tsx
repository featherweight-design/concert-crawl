import { EventsSkeleton } from '@/components/admin/events/list/EventsSkeleton';

/**
 * `07/loading-events` on desktop, `07/loading-any-list-on-mobile` on the
 * phone: EventsSkeleton draws both and the breakpoint shows one.
 */
export default function AdminEventsLoading() {
  return <EventsSkeleton />;
}
