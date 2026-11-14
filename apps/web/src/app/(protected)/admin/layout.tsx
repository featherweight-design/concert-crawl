import './admin.css';
import type { AvatarColor } from '@concert-crawl/types';
import { auth, requireAdminUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { AdminThemeProvider } from '@/components/admin/shell/AdminThemeProvider';
import { AdminShellClient } from '@/components/admin/shell/AdminShellClient';

import { fetchNeedsYouDecisions } from '@/components/admin/shell/needs-you-count';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminUser = await requireAdminUser();
  const { getToken } = await auth();
  const token = await getToken();

  let needsYou = 0;
  let handle: string | null = null;
  let avatarColor: AvatarColor | null = null;
  let avatarSecondColor: AvatarColor | null = null;
  if (token) {
    const [review, me] = await Promise.allSettled([
      // The queue's own decision count, the same one Health's summary shows.
      fetchNeedsYouDecisions(token),
      // The handle is the display name's second choice (#178 item 29); the
      // avatar colours are the admin's own, as every admin avatar draws them.
      apiClient.get<{
        handle: string | null;
        avatarColor: AvatarColor | null;
        avatarSecondColor: AvatarColor | null;
      }>('/v1/users/me', token),
    ]);
    if (review.status === 'fulfilled') {
      needsYou = review.value;
    } else {
      console.warn('[admin layout] review counts fetch failed', {
        reason: review.reason,
      });
    }
    if (me.status === 'fulfilled') {
      handle = me.value.handle;
      avatarColor = me.value.avatarColor ?? null;
      avatarSecondColor = me.value.avatarSecondColor ?? null;
    }
  }

  return (
    <AdminThemeProvider>
      <div
        style={{
          display: 'flex',
          height: '100dvh',
          overflow: 'hidden',
          background: 'var(--bg)',
          color: 'var(--fg)',
        }}
      >
        <AdminShellClient
          badgeCounts={{ needsYou }}
          user={{
            firstName: adminUser.firstName,
            handle,
            avatarColor,
            avatarSecondColor,
            email: adminUser.email,
          }}
        >
          {children}
        </AdminShellClient>
      </div>
    </AdminThemeProvider>
  );
}
