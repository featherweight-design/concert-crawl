'use client'

import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'
import { PWA_COPY } from './definitions/copy'

export const OfflineBanner = () => {
  const online = useOnlineStatus()
  if (online) return null

  // Rendered in normal document flow (not fixed) so it pushes the sticky app
  // header down instead of overlaying it. It sits at the top of <body>, above
  // the app content, and scrolls away with the page.
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-warning px-4 py-2 text-center text-sm text-fg-on-accent"
    >
      {PWA_COPY.offlineBanner}
    </div>
  )
}
