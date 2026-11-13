import { requireAdminUser } from '@/lib/auth';
import { NeedsYouClient } from '@/components/admin/needs-you/NeedsYouClient';

/**
 * 2b Needs you. The queue loads in the browser with the admin's token, so an
 * answer, an Undo and Try again refresh it without a navigation.
 * `?item=<key>` opens one item's panel (the old Review links land here).
 */
export default async function AdminNeedsYouPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser();
  const item = (await searchParams)?.['item'];
  return (
    <NeedsYouClient item={typeof item === 'string' && item ? item : null} />
  );
}
