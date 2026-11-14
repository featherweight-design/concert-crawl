import { redirect } from 'next/navigation';
import { auth, requireAdminUser } from '@/lib/auth';
import { ReviewPageClient } from '@/components/admin/review/ReviewPageClient';
import { fetchNeedsYouDecisions } from '@/components/admin/shell/needs-you-count';
import {
  NEEDS_YOU_HREF,
  reviewPricesRedirect,
  reviewRedirectsToNeedsYou,
} from '@/lib/admin/review-tabs';

const firstParam = (value: string | string[] | undefined): string | null =>
  typeof value === 'string' ? value : (value?.[0] ?? null);

/**
 * Review keeps one tab (all events). The price tabs live on Prices and the
 * decision tabs in Needs you, so those URLs and a missing `?tab=` redirect
 * before any fetch.
 */
export default async function ReviewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser();
  const params = await searchParams;
  const tab = firstParam(params?.['tab']);
  const pricesHref = reviewPricesRedirect(tab, firstParam(params?.['section']));
  if (pricesHref) redirect(pricesHref);
  if (reviewRedirectsToNeedsYou(tab)) redirect(NEEDS_YOU_HREF);

  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return null;

  // The one Needs you number, the same source as the sidebar badge. A
  // failure hides the pending pill rather than showing a wrong number.
  const decisions = await fetchNeedsYouDecisions(token).catch(
    (err: unknown): number => {
      console.error('admin review: needs-you count failed', err);
      return 0;
    },
  );

  return <ReviewPageClient decisions={decisions} />;
}
