import { requireAdminUser } from '@/lib/auth';
import { siteOrigin } from '@/lib/share/site-origin';
import { InviteCodesClient } from '@/components/admin/invite-codes/InviteCodesClient';

/**
 * 5b Invite codes. The list loads in the browser with the admin's token, so
 * Try again and every edit refresh it without a navigation.
 */
export default async function AdminInviteCodesPage() {
  await requireAdminUser();
  return <InviteCodesClient origin={siteOrigin()} />;
}
