'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { SPNumberField } from './SPNumberField'
import { ChipGroup } from './ChipGroup'
import type { PriceSubmission } from '@concert-crawl/types'
import { SP_POLICY } from '@concert-crawl/types'

const VENDOR_OPTIONS = [
  { value: 'AXS', label: 'AXS' },
  { value: 'Ticketmaster', label: 'Ticketmaster' },
  { value: 'SeatGeek', label: 'SeatGeek' },
  { value: 'DICE', label: 'DICE' },
  { value: 'Eventbrite', label: 'Eventbrite' },
  { value: 'VenueBoxOffice', label: 'Venue box office' },
]

interface DisputeFormProps {
  submission: PriceSubmission
  eventId: string
}

export function DisputeForm({ submission, eventId }: DisputeFormProps) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [floor, setFloor] = useState('')
  const [ceiling, setCeiling] = useState('')
  const [vendor, setVendor] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (success) {
    return (
      <div className="rounded-xl border border-border p-4 bg-surface-1">
        <p className="text-sm font-semibold text-fg">Logged.</p>
        <p className="text-sm text-fg-muted mt-1">
          Your alternate price will show up alongside this one.
        </p>
        <button
          onClick={() => router.push(`/events/${eventId}`)}
          className="mt-3 text-sm text-signal underline"
        >
          Back to show
        </button>
      </div>
    )
  }

  async function handleSubmit() {
    const newErrors: Record<string, string> = {}
    const floorNum = Number(floor)
    if (!floor || isNaN(floorNum) || floorNum < SP_POLICY.floorMin) {
      newErrors['floor'] = 'Has to be at least $1.'
    } else if (floorNum > SP_POLICY.floorMax) {
      newErrors['floor'] = 'Cap is $2000.'
    }
    if (ceiling) {
      const ceilNum = Number(ceiling)
      if (ceilNum > SP_POLICY.ceilingMax) {
        newErrors['ceiling'] = 'Cap is $2000.'
      } else if (!newErrors['floor'] && ceilNum < floorNum) {
        newErrors['ceiling'] = "Ceiling can't be below floor."
      }
    }
    if (!vendor) newErrors['vendor'] = "Pick where it's listed."
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setSubmitting(true)
    try {
      const token = await getToken()
      if (!token) {
        setErrorMsg('You must be signed in to file a dispute.')
        setSubmitting(false)
        return
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/submissions/${submission.id}/dispute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            floor: floorNum,
            ceiling: ceiling ? Number(ceiling) : undefined,
            vendor,
          }),
        },
      )
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? 'Dispute failed')
      }
      setSuccess(true)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-danger p-4 flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-fg">
          What did <em>you</em> see instead?
        </p>
        <p className="text-xs text-fg-muted mt-1">
          Disputes have to come with a price and a vendor. Keeps it honest.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SPNumberField
          id="dispute-floor"
          label="Floor"
          value={floor}
          onChange={setFloor}
          placeholder="35"
          required
          error={errors['floor']}
        />
        <SPNumberField
          id="dispute-ceiling"
          label="Ceiling"
          value={ceiling}
          onChange={setCeiling}
          placeholder="75"
          error={errors['ceiling']}
        />
      </div>

      <ChipGroup
        label="Where it's listed *"
        options={VENDOR_OPTIONS}
        value={vendor}
        onChange={setVendor}
        error={errors['vendor']}
      />

      {errorMsg && <p className="text-xs text-danger">{errorMsg}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="flex-1 h-11 rounded-xl border border-border-strong text-sm text-fg"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 h-11 rounded-xl bg-danger text-white font-semibold text-sm disabled:opacity-60"
        >
          {submitting ? 'Filing…' : 'File dispute'}
        </button>
      </div>
    </div>
  )
}
