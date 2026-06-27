import { FeedbackEdgeTabGate } from '@/components/consumer/feedback'
import { OnboardingThemeFlush } from '@/components/auth/OnboardingThemeFlush'
import { FeatureDropPillGate } from '@/components/consumer/release-notes/FeatureDropPillGate'

interface ProtectedLayoutProps {
  children: React.ReactNode
}

// Auth gating is handled by edge middleware (apps/web/src/middleware.ts) — any
// unauthenticated request to a (protected) route is 307-redirected at the POP
// before this server component runs. See #841.
export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <>
      {children}
      <FeedbackEdgeTabGate />
      <FeatureDropPillGate />
      <OnboardingThemeFlush />
    </>
  )
}
