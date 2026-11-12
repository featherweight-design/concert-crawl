import { PageSkeleton } from '@/components/admin/primitives';

/** The To check tab's shape: three tabs, three show-date chips, its rows. */
export default function AdminArtistsLoading() {
  return <PageSkeleton tabs={3} filters={3} rows={6} rowHeight={94} />;
}
