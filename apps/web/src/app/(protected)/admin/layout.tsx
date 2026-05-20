import './admin.css'
import { requireAdminUser } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { apiClient } from '@/lib/api'
import { AdminThemeProvider } from '@/components/admin/shell/AdminThemeProvider'
import { AdminShellClient } from '@/components/admin/shell/AdminShellClient'

interface CrawlStatusVenue {
  id: string
  name: string
  blockedAt: string | null
  lastRun: { status: string } | null
}

interface ReviewCounts {
  pendingEvents: number
  pendingPrices: number
}

interface FeedbackCounts {
  unread: number
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
  let pendingReview = 0
  let unreadFeedback = 0

  if (token) {
    const [statusRes, reviewRes, feedbackRes] = await Promise.allSettled([
      apiClient.get<CrawlStatusVenue[]>('/v1/admin/crawl/status', token),
      apiClient.get<ReviewCounts>('/v1/admin/review/counts', token),
      apiClient.get<FeedbackCounts>('/v1/admin/feedback/counts', token),
    ])

    if (statusRes.status === 'fulfilled') {
      blockedCrawls = statusRes.value.filter(
        (venue) =>
          (venue.blockedAt !== null && venue.lastRun?.status !== 'success') ||
          venue.lastRun?.status === 'failed',
      ).length
    } else {
      console.warn('[admin layout] crawl status fetch failed', {
        reason: statusRes.reason,
      })
    }

    if (reviewRes.status === 'fulfilled') {
      pendingReview =
        reviewRes.value.pendingEvents + reviewRes.value.pendingPrices
    } else {
      console.warn('[admin layout] review counts fetch failed', {
        reason: reviewRes.reason,
      })
    }

    if (feedbackRes.status === 'fulfilled') {
      unreadFeedback = feedbackRes.value.unread
    } else {
      console.warn('[admin layout] feedback counts fetch failed', {
        reason: feedbackRes.reason,
      })
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
          badgeCounts={{
            crawl: blockedCrawls,
            review: pendingReview,
            feedback: unreadFeedback,
          }}
          user={{ firstName: adminUser.firstName, email: adminUser.email }}
        >
          {children}
        </AdminShellClient>
      </div>
    </AdminThemeProvider>
  )
}
