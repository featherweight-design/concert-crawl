import { auth, requireAdminUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { OperationsClient } from '@/components/admin/operations/OperationsClient';

/**
 * Operations (`07/activity-log`): the section's tabs, Feedback first. The
 * Feedback tab's count is best effort: a failed read draws no count rather
 * than failing the page.
 */
export default async function AdminOperationsPage() {
  await requireAdminUser();
  const { getToken } = await auth();
  const token = await getToken();
  const unread = token
    ? await apiClient
        .get<{ unread: number }>('/v1/admin/feedback/counts', token)
        .then((counts) => counts.unread)
        .catch(() => null)
    : null;
  return <OperationsClient feedbackUnread={unread} />;
}
