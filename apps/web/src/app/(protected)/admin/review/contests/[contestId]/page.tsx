import { requireAdminUser } from '@/lib/auth'
import { AdminDisputePanel } from '@/components/admin/review/AdminDisputePanel'

// /admin/review/contests/:contestId — the per-contest adjudication page.
// Server component; awaits Next 15's async `params` then mounts the
// client-side AdminDisputePanel.
//
// Auth: the parent `(protected)/admin/layout.tsx` already calls
// requireAdminUser(), so the layout enforces the admin gate. We
// re-assert here for defense-in-depth — same pattern the other admin
// pages use (memory:project_phase76_admin_ui_redesign — "admin auth
// defense-in-depth"). If the layout ever changes shape this page is
// still gated.
//
// Data: the panel fetches the contest detail itself via
// useReviewContestDetail (React Query), so the page passes the id
// through without doing its own SSR fetch. This keeps the panel's
// loading / error / refetch story unified across all the surfaces that
// mount it (and the queue cache stays in sync across navigations).

interface PageProps {
  // Next 15 App Router — dynamic route params arrive as a Promise that
  // must be awaited before destructuring. The async signature is part
  // of the framework's typed-routes contract; sync access throws at
  // build time.
  params: Promise<{ contestId: string }>
}

export default async function ContestReviewPage({ params }: PageProps) {
  await requireAdminUser()
  const { contestId } = await params

  return (
    <div style={{ padding: '24px 28px' }}>
      <AdminDisputePanel contestId={contestId} />
    </div>
  )
}
