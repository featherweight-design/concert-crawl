import { FeedbackEdgeTabGate } from '@/components/consumer/feedback'
import { OnboardingThemeFlush } from '@/components/auth/OnboardingThemeFlush'
import { FeatureDropPillGate } from '@/components/consumer/release-notes/FeatureDropPillGate'
import { LifecycleNudgesGate } from '@/components/consumer/lifecycle-nudges'
import { FollowNudgeGate } from '@/components/consumer/following/nudge/FollowNudgeGate'

interface ProtectedLayoutProps {
  children: React.ReactNode
}

// Auth gating is handled by edge middleware (apps/web/src/middleware.ts) — any
// unauthenticated request to a (protected) route is 307-redirected at the POP
// before this server component runs. See #841.
//
// That is no longer true for every route in this group: #794 makes /events,
// /venues, /search and /watching public, so this layout can now
// render for an anonymous visitor. Every gate below therefore checks
// isSignedIn itself instead of trusting the folder name — the group boundary
// is a layout-sharing convention here, not an auth guarantee.
export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <>
      {children}
      <FeedbackEdgeTabGate />
      <FeatureDropPillGate />
      <OnboardingThemeFlush />
      <LifecycleNudgesGate />
      <FollowNudgeGate />
    </>
  )
}
