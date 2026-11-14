import { requireAdminUser } from '@/lib/auth';
import { OperationsClient } from '@/components/admin/operations/OperationsClient';
import { operationsTabOf } from '@/components/admin/operations/operations-tabs';

/**
 * Operations (`07/activity-log`): the section's tabs, Feedback first.
 * `?tab=log` opens the Activity log. The Feedback tab's count comes from the
 * inbox itself, so the page reads nothing.
 */
export default async function AdminOperationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  await requireAdminUser();
  const params = await searchParams;
  return <OperationsClient initialTab={operationsTabOf(params?.['tab'])} />;
}
