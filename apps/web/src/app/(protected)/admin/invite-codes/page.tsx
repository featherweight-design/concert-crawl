import { requireAdminUser } from '@/lib/auth';
import { InviteCodesClient } from '@/components/admin/invite-codes/InviteCodesClient';

/**
 * 5b Invite codes. The list loads in the browser with the admin's token, so
 * Try again refreshes it without a navigation.
 */
export default async function AdminInviteCodesPage() {
  await requireAdminUser();
  return <InviteCodesClient />;
}
