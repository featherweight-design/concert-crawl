'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PENDING_TIER_PARAM, stripIntentParams } from '@/lib/auth/intent'
import { usePlanState } from '@/lib/queries/use-plan-state'
import { decodePendingTier } from './lib/pending-tier'
import type { TierKey } from './definitions/types'
import { TierPickerSheet } from './TierPickerSheet'

/**
 * Reopens the tier picker on the tier a visitor chose before they had an
 * account (#1284).
 *
 * The choice arrives as a `tier` param carried through Clerk by /sign-up and
 * /auth/complete. It is deliberately not an `intent` verb: `intent` holds one
 * pending action, and someone who taps Watch and then picks Premium has two.
 *
 * Mounted once in the app layout rather than per page, so every destination the
 * funnel can land on reopens through the same code path.
 */
export const PendingTierPicker = () => {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { data: planState } = usePlanState()

  const raw = params.get(PENDING_TIER_PARAM)

  // Captured rather than read on render: stripping the URL is what stops a
  // refresh reopening the sheet, so the tier has to outlive the param.
  const [tier, setTier] = useState<TierKey | null>(null)
  const [open, setOpen] = useState(false)
  const captured = useRef<string | null>(null)

  useEffect(() => {
    if (!raw || captured.current === raw) return
    captured.current = raw
    const chosen = decodePendingTier(raw)
    // Free needs no picker: signing up already delivered it. Only a paid choice
    // has anything left to do.
    if (!chosen || chosen === 'free') return
    setTier(chosen)
    setOpen(true)
  }, [raw])

  useEffect(() => {
    if (!raw) return
    // `stripIntentParams` drops the watch seam's params too, and the seam needs
    // them until its own replay has run. Whichever component still has work
    // pending owns the URL; this one waits and rides along with that strip.
    if (params.get('intent')) return
    router.replace(stripIntentParams(pathname, params, window.location.hash), {
      scroll: false,
    })
  }, [raw, pathname, params, router])

  // The picker needs a real plan to decide which cards and CTAs to show, so a
  // cold cache holds the sheet back rather than rendering it against a guess.
  if (!open || !planState) return null

  return (
    <TierPickerSheet
      open
      onClose={() => setOpen(false)}
      planState={planState}
      // Server-resolved elsewhere off the request's country header; reading
      // headers here would make the whole app layout dynamic. Assuming SCA
      // shows one extra legal line where it is not required, which is the
      // harmless direction to be wrong in.
      scaRegion
      entry="post-signup"
      initialTier={tier}
    />
  )
}
