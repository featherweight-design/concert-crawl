'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants'
import { TierPickerSheet } from '@/components/consumer/tier-picker/TierPickerSheet'
import { isPriceStale } from '@/components/consumer/lib/staleness'

const copy = CONSUMER_COPY.priceStaleness

// Without the fallback an unset var interpolates as the literal `undefined`,
// which resolves relative and 404s rather than failing loudly.
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? ''

interface StillAccurateActionProps {
  eventId: string
  submissionId: string | null | undefined
  observedAt: string | null | undefined
  // The one stamp site whose timestamp lives in client state rather than in a
  // server prop needs to drop its row itself; `router.refresh()` cannot reach
  // a `useState` initializer. See EventDetailClient's confirmedSub branch.
  onSighted?: () => void
}

/**
 * The way out of a stale price badge: report that the price is still on sale
 * and the freshness stamp advances without re-submitting the price.
 *
 * Renders only beside a genuinely stale stamp, and only for a signed-in reader
 * on a price that has a submission behind it — a crawler price has no row to
 * stamp, so it is excluded by the absent id rather than by a source check.
 */
export const StillAccurateAction = ({
  eventId,
  submissionId,
  observedAt,
  onSighted,
}: StillAccurateActionProps) => {
  const router = useRouter()
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [saving, setSaving] = useState(false)
  const [gateOpen, setGateOpen] = useState(false)

  const eligible =
    submissionId != null &&
    observedAt != null &&
    isPriceStale(observedAt) &&
    // Reading auth before Clerk resolves renders the action to anonymous
    // readers, who then get a 401 on click. This codebase has shipped that bug.
    isLoaded &&
    isSignedIn

  const onClick = async (): Promise<void> => {
    if (saving) return
    setSaving(true)
    try {
      const token = await getToken()
      const res = await fetch(
        `${API_URL}/v1/events/${eventId}/price-submissions/${submissionId}/still-accurate`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      )

      // 401 is the only response a refresh cannot answer, because the problem
      // is a missing identity rather than a stale view. Every other outcome —
      // success, someone else won the race, the row moved off corroborated,
      // the event went away — means the reader is looking at something out of
      // date, so hand the page back to the server and let it re-derive.
      if (res.status === 401) {
        setGateOpen(true)
        return
      }

      if (res.ok || res.status === 409) onSighted?.()
      router.refresh()
    } catch (err) {
      // A network failure leaves the badge where it is, which is the honest
      // state. Refresh anyway so the reader is not looking at a frozen view.
      console.error('still-accurate request failed', err)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  if (gateOpen) {
    return (
      <TierPickerSheet
        open
        onClose={() => setGateOpen(false)}
        planState={LOGGED_OUT_PLAN_STATE}
        // No payment element is reachable signed out; `true` only adds legal
        // copy, matching the other logged-out picker call-sites.
        scaRegion
        entry="logged-out-price"
      />
    )
  }

  if (!eligible) return null

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={saving}
      data-testid="still-accurate-action"
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        minHeight: 24,
        cursor: saving ? 'default' : 'pointer',
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.04em',
        color: 'var(--fg-subtle)',
        textDecoration: 'underline',
        textUnderlineOffset: 2,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {saving ? copy.stillAccuratePending : copy.stillAccurateAction}
    </button>
  )
}
