'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { StatusBadge } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { inspectorPath } from '@/components/admin/triage/lib/deep-links'
import type { AcknowledgedFault } from '@/components/admin/triage/definitions/types'
import { fetchVenueFault } from '@/components/admin/fault-acknowledge-control/lib/acknowledgements'

const COPY = ADMIN_COPY.faultAcknowledge

interface VenueExpectedBadgeProps {
  venueId: string
}

/**
 * Read-only. Acknowledging stays in the crawl inspector, next to the run
 * history that justifies it — this only says one is in force, and links there.
 */
export const VenueExpectedBadge = ({ venueId }: VenueExpectedBadgeProps) => {
  const { getToken, isLoaded } = useAuth()
  const [acknowledged, setAcknowledged] = useState<AcknowledgedFault | null>(
    null,
  )
  const isUnmounted = useRef(false)

  useEffect(() => {
    isUnmounted.current = false
    return () => {
      isUnmounted.current = true
    }
  }, [])

  useEffect(() => {
    // A null token before Clerk hydrates is transient, but nothing else in
    // these deps changes when auth arrives — so reading it as "no fault"
    // strands the badge for the rest of the session.
    if (!isLoaded) return

    const load = async () => {
      try {
        const token = await getToken()
        if (!token) return
        const result = await fetchVenueFault(venueId, token)
        if (isUnmounted.current) return
        setAcknowledged(result.acknowledged)
      } catch (loadErr) {
        // A hint, not the page. It stays logged so a badge that never renders
        // is distinguishable from a venue with nothing acknowledged.
        console.error('fetchVenueFault error:', loadErr)
      }
    }
    void load()
  }, [venueId, getToken, isLoaded])

  if (acknowledged === null) return null

  return (
    // Not `faultHref` — that degrades to the venue page when there is no run,
    // which from the venue page is a link to itself. The inspector is where
    // the acknowledgement can be undone either way.
    <Link
      href={inspectorPath(venueId, 'history')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        textDecoration: 'none',
      }}
    >
      <StatusBadge kind="signal" variant="outline">
        {`${COPY.acknowledgedTitle} · ${
          ADMIN_COPY.triage.conditions[acknowledged.condition].label
        }`}
      </StatusBadge>
      <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
        {acknowledged.acknowledgement.reason}
      </span>
    </Link>
  )
}
