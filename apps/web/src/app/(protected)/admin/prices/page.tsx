import { requireAdminUser } from '@/lib/auth';
import {
  PricesClient,
  type PricesTab,
} from '@/components/admin/prices/PricesClient';

const tabOf = (value: string | string[] | undefined): PricesTab =>
  value === 'submitted' || value === 'checks' ? value : 'missing';

/**
 * `?handle=` opens Submitted prices filtered to one fan (the person page's
 * "See their Submitted prices"). Same shape the API accepts: trimmed, a
 * leading "@" ignored, 1 to 100 characters; anything else is no filter.
 */
const handleOf = (value: string | string[] | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const handle = value.trim().replace(/^@/, '');
  return handle.length >= 1 && handle.length <= 100 ? handle : null;
};

/**
 * 4d Prices. The lists load in the browser with the admin's token, so adding a
 * price and "Publish and next" update the page without a navigation.
 * `?tab=submitted|checks` opens another tab (stored notification links still
 * carry `/admin/prices`, which is the Missing a price tab).
 */
export default async function AdminPricesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser();
  const params = await searchParams;
  const tab = tabOf(params?.['tab']);
  return (
    <PricesClient
      initialTab={tab}
      initialHandle={tab === 'submitted' ? handleOf(params?.['handle']) : null}
    />
  );
}
