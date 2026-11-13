import { SentryTierTag } from '@/components/auth/SentryTierTag';
import { PendingErrorReportFlush } from '@/components/consumer/error-report/PendingErrorReportFlush';
import { FeedbackEdgeTabGate } from '@/components/consumer/feedback';
import { ScrollResetOnNavigate } from '@/components/consumer/scroll-reset/ScrollResetOnNavigate';
import { OnboardingThemeFlush } from '@/components/auth/OnboardingThemeFlush';
import { FeatureDropPillGate } from '@/components/consumer/release-notes/FeatureDropPillGate';
import { FollowNudgeGate } from '@/components/consumer/following/nudge/FollowNudgeGate';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

// Auth gating is handled by the proxy (apps/web/src/proxy.ts) — any
// unauthenticated request to a (protected) route is 307-redirected by the proxy
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
      {/* Mounted here, once, rather than in (main): /me, /me/edit,
          /me/submissions and /search sit outside (main) and need it too.
          Next skips its own scroll reset when the new page's top is still on
          screen, so a part-scrolled page landed the next one part way down. */}
      <ScrollResetOnNavigate />
      <FeedbackEdgeTabGate />
      <FeatureDropPillGate />
      <OnboardingThemeFlush />
      <FollowNudgeGate />
      <SentryTierTag />
      <PendingErrorReportFlush />
    </>
  );
}
