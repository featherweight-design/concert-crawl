'use client'

import { useRouter } from 'next/navigation'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.eventDetail

export function BackButton() {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => {
        // Prefer history-aware back so query state (filters, scroll position)
        // on the previous page is restored. Falls back to /events only when
        // this tab has no prior history (e.g., direct event link opened in
        // a fresh tab). For all other entries — including external referrers
        // — `router.back()` returns the user to wherever they came from,
        // which matches the browser's own back affordance. (#637)
        if (window.history.length <= 1) {
          router.push('/events')
        } else {
          router.back()
        }
      }}
      aria-label={copy.backAriaLabel}
      className="absolute left-3.5 top-14 z-10 flex h-9 w-9 items-center justify-center rounded-full"
      style={{ background: 'var(--scrim)' }}
    >
      <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden>
        <path
          d="M8 2L2 8l6 6"
          stroke="var(--fg)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
