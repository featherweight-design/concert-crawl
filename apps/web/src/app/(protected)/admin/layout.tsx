import './admin.css'
import { requireAdminUser } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { apiClient } from '@/lib/api'
import { AdminThemeProvider } from '@/components/admin/shell/AdminThemeProvider'
import { AdminSidebar } from '@/components/admin/shell/AdminSidebar'
import { AdminTopbar } from '@/components/admin/shell/AdminTopbar'

interface CrawlStatusVenue {
  id: string
  name: string
  blockedAt: string | null
  lastRun: { status: string } | null
}

interface AdminEvent {
  id: string
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adminUser = await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()

  let blockedCrawls = 0
  let pendingEvents = 0

  if (token) {
    const [statusRes, eventsRes] = await Promise.allSettled([
      apiClient.get<CrawlStatusVenue[]>('/v1/admin/crawl/status', token),
      apiClient.get<AdminEvent[]>(
        '/v1/admin/events?verified=false&limit=100',
        token,
      ),
    ])

    if (statusRes.status === 'fulfilled') {
      blockedCrawls = statusRes.value.filter(
        (venue) =>
          (venue.blockedAt !== null && venue.lastRun?.status !== 'success') ||
          venue.lastRun?.status === 'failed',
      ).length
    } else {
      console.warn('[admin layout] badge count fetch failed', {
        reason: statusRes.reason,
      })
    }

    if (eventsRes.status === 'fulfilled') {
      pendingEvents = eventsRes.value.length
    } else {
      console.warn('[admin layout] pending events fetch failed', {
        reason: eventsRes.reason,
      })
    }
  }

  return (
    <AdminThemeProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
        <AdminSidebar
          badgeCounts={{ crawl: blockedCrawls, events: pendingEvents }}
          user={{ firstName: adminUser.firstName, email: adminUser.email }}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminTopbar />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AdminThemeProvider>
  )
}
