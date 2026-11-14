import { requireAdminUser } from '@/lib/auth';
import { OperationsClient } from '@/components/admin/operations/OperationsClient';

/**
 * Operations (`07/activity-log`): the section's tabs, Feedback first.
 * `?tab=log` opens the Activity log; the client reads the tab off the URL
 * itself, so a switch never races a prop. The Feedback tab's count comes from
 * the inbox itself, so the page reads nothing.
 */
export default async function AdminOperationsPage() {
  await requireAdminUser();
  return <OperationsClient />;
}
