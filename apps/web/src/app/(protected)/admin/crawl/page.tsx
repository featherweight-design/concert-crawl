import { permanentRedirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdminUser } from '@/lib/auth';
import { venueTabHref } from '@/lib/admin/venue-tabs';
import { CrawlRunsClient } from '@/components/admin/crawl-runs/CrawlRunsClient';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * `?venueId=` as a venue's runs link: a valid uuid only. A venue's runs now
 * live on its Runs tab (3b part 4, decision 4), so that link redirects there.
 */
const venueIdSchema = z.uuid();

/**
 * 1d Crawl runs: every crawl, nightly and by hand, as batches. The list loads
 * in the browser with the admin's token; its filter lives in `?kind=`.
 */
export default async function AdminCrawlPage({ searchParams }: Props) {
  await requireAdminUser();
  const rawVenueId = (await searchParams).venueId;
  const venueId =
    (Array.isArray(rawVenueId) ? rawVenueId[0] : rawVenueId) || undefined;
  // Every other param (`tab`, `hasAlert`) is dropped with the redirect: the
  // Runs tab has no Diagnostics or staged apply (A3 §3b row 8).
  const redirectTo = venueIdSchema.safeParse(venueId);
  if (redirectTo.success) {
    permanentRedirect(venueTabHref(redirectTo.data, 'runs'));
  }
  return <CrawlRunsClient />;
}
