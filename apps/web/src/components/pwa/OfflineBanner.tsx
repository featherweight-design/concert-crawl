'use client'

import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'
import { PWA_COPY } from './definitions/copy'

export const OfflineBanner = () => {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 bg-warning px-4 py-2 text-center text-sm text-fg-on-accent"
    >
      {PWA_COPY.offlineBanner}
    </div>
  )
}
