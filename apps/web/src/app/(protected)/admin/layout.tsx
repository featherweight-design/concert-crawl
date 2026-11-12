import './admin.css';
import { auth, requireAdminUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { AdminThemeProvider } from '@/components/admin/shell/AdminThemeProvider';
import { AdminShellClient } from '@/components/admin/shell/AdminShellClient';

interface ReviewCounts {
  eventFlags: number;
  prices: number;
  missing: number;
  priceContests: number;
}

/**
 * Needs you's badge, interim until 2b: today's decision tabs in Review.
 * Price coverage is a backlog, never a badge, so `prices` stays out
 * (README "Where today's pages go").
 */
const needsYouCount = (counts: ReviewCounts): number =>
  counts.eventFlags + counts.missing + counts.priceContests;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminUser = await requireAdminUser();
  const { getToken } = await auth();
  const token = await getToken();

  let needsYou = 0;
  if (token) {
    try {
      needsYou = needsYouCount(
        await apiClient.get<ReviewCounts>('/v1/admin/review/counts', token),
      );
    } catch (err) {
      console.warn('[admin layout] review counts fetch failed', {
        reason: err,
      });
    }
  }

  return (
    <AdminThemeProvider>
      <div
        style={{
          display: 'flex',
          height: '100vh',
          overflow: 'hidden',
          background: 'var(--bg)',
          color: 'var(--fg)',
        }}
      >
        <AdminShellClient
          badgeCounts={{ needsYou }}
          user={{ firstName: adminUser.firstName, email: adminUser.email }}
        >
          {children}
        </AdminShellClient>
      </div>
    </AdminThemeProvider>
  );
}
