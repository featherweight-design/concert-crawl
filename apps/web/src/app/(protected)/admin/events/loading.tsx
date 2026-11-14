import { PageSkeleton } from '@/components/admin/primitives';

/**
 * `07/loading-events`: the title and subtitle, the search with five filter
 * pills in one row, then the table's rows.
 */
export default function AdminEventsLoading() {
  return (
    <PageSkeleton
      heading
      inlineSearch
      card
      filters={5}
      rows={8}
      columns={5}
      rowHeight={65}
    />
  );
}
