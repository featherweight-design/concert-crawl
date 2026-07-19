'use client'

import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'
import { OFFLINE_COPY } from './definitions/copy'

export const OfflinePill = () => {
  const online = useOnlineStatus()
  if (online) return null

  // `role=status` + `aria-live=polite` announces the state change without
  // being modal. `aria-label` carries the full sentence — the dot color is
  // aria-hidden because color must never be the only signal (WCAG 1.4.1).
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={OFFLINE_COPY.pillAria}
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 text-[12px] font-semibold text-fg-muted"
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-warning" />
      {OFFLINE_COPY.pillLabel}
    </div>
  )
}
