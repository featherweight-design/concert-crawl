'use client'

import { useEffect, useRef } from 'react'
import { track } from '@/lib/analytics'

/**
 * Records that a poster link actually landed somebody on the public mirror.
 *
 * Renders nothing — the mirror is a server component, and this is the one
 * thing on it that has to happen in a browser. Without it the share funnel
 * ends at "link copied" and never shows whether anyone opened it.
 */
export interface PublicEventViewProps {
  eventId: string
}

/**
 * The referring host, never the full referrer.
 *
 * A full referrer URL routinely carries a query string belonging to somebody
 * else's session — a search, a signed link, a tracking token. The host alone
 * answers the only question being asked (where do shares get opened) and
 * carries none of that.
 */
const referrerHost = (): string | null => {
  if (typeof document === 'undefined') return null
  const raw = document.referrer
  if (raw === '') return null
  try {
    // `about:`, `file:` and other opaque schemes parse fine but carry no host.
    // An empty string would sit in the analytics column looking like a value.
    const { host } = new URL(raw)
    return host === '' ? null : host
  } catch (err) {
    console.error('analytics: unparseable referrer', err)
    return null
  }
}

export const PublicEventView = ({ eventId }: PublicEventViewProps) => {
  // A view is one event per show. Strict Mode runs effects twice in development,
  // and without a guard every local page load would double-count.
  //
  // Keyed by `eventId` rather than a bare boolean: React can reuse this instance
  // across a client-side navigation between two mirrors, and a boolean that only
  // ever flips once would swallow the view of every show after the first.
  const firedFor = useRef<string | null>(null)

  useEffect(() => {
    if (firedFor.current === eventId) return
    firedFor.current = eventId
    track('public_event_viewed', { eventId, referrer: referrerHost() })
  }, [eventId])

  return null
}
