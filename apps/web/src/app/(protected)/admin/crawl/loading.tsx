import {
  BatchesSkeleton,
  CrawlRunsHeader,
} from '@/components/admin/crawl-runs/BatchesTable';

/**
 * `A3/09/loading-runs-d`: the real header and column labels over bar rows
 * (`07/loading-any-list-on-mobile` on the phone).
 */
export default function AdminCrawlLoading() {
  return (
    <div className="crawl-runs-page">
      <CrawlRunsHeader />
      <BatchesSkeleton />
    </div>
  );
}
