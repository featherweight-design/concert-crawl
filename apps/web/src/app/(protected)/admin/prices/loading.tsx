import { PageSkeleton } from '@/components/admin/primitives';

/** Loading in the Prices page's shape: its tabs, then the Missing a price rows. */
export default function AdminPricesLoading() {
  return <PageSkeleton tabs={3} rows={5} columns={4} rowHeight={64} />;
}
