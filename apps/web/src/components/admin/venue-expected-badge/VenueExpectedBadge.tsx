'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { StatusBadge } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { CCTip, type TipContent } from '@/components/ui/cc-tip'
import type { AcknowledgedFault } from '@/components/admin/triage/definitions/types'
import { fetchVenueFault } from '@/components/admin/fault-acknowledge-control/lib/acknowledgements'

const COPY = ADMIN_COPY.faultAcknowledge

interface VenueExpectedBadgeProps {
  venueId: string
}

/**
 * Read-only. Acknowledging stays in the crawl inspector, next to the run
 * history that justifies it — this only says one is in force, and the tip
 * says where to undo it.
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

  const tip: TipContent = {
    label: COPY.badge,
    variant: 'titled',
    title: ADMIN_COPY.triage.conditions[acknowledged.condition].label,
    body: COPY.badgeTipBody(acknowledged.acknowledgement.reason),
  }

  return (
    <CCTip tip={tip} placement="bottom" align="start">
      <StatusBadge kind="signal" variant="outline">
        {COPY.badge}
      </StatusBadge>
    </CCTip>
  )
}
