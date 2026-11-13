import { requireAdminUser } from '@/lib/auth';
import {
  PricesClient,
  type PricesTab,
} from '@/components/admin/prices/PricesClient';

const tabOf = (value: string | string[] | undefined): PricesTab =>
  value === 'submitted' || value === 'checks' ? value : 'missing';

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
  return <PricesClient initialTab={tabOf((await searchParams)?.['tab'])} />;
}
