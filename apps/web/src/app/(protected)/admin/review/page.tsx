import { redirect } from 'next/navigation';
import { requireAdminUser } from '@/lib/auth';
import {
  NEEDS_YOU_HREF,
  reviewPricesRedirect,
  reviewRedirectsToNeedsYou,
} from '@/lib/admin/review-tabs';

const firstParam = (value: string | string[] | undefined): string | null =>
  typeof value === 'string' ? value : (value?.[0] ?? null);

/**
 * Review is retired (0c). The price tabs live on Prices, the decision tabs in
 * Needs you, and the last one, all events, is the Events list: a past show is
 * found there with the Past chip and the search box. Old links and bookmarks
 * land in the right place.
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
  redirect('/admin/events');
}
