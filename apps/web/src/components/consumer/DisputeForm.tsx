'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { SPNumberField } from './SPNumberField'
import { VendorField } from '@/components/consumer/submit-price/VendorField'
import type { PriceSubmission, Vendor } from '@concert-crawl/types'
import { SP_POLICY } from '@concert-crawl/types'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY

interface DisputeFormProps {
  submission: PriceSubmission
  eventId: string
}

export function DisputeForm({ submission, eventId }: DisputeFormProps) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [floor, setFloor] = useState('')
  const [ceiling, setCeiling] = useState('')
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (success) {
    return (
      <div className="rounded-xl border border-border p-4 bg-surface-1">
        <p className="text-sm font-semibold text-fg">
          {copy.disputeForm.successTitle}
        </p>
        <p className="text-sm text-fg-muted mt-1">
          {copy.disputeForm.successBody}
        </p>
        <button
          onClick={() => router.push(`/events/${eventId}`)}
          className="mt-3 text-sm text-signal underline"
        >
          {copy.disputeForm.successCta}
        </button>
      </div>
    )
  }

  async function handleSubmit() {
    const newErrors: Record<string, string> = {}
    const floorNum = Number(floor)
    if (!floor || isNaN(floorNum) || floorNum < SP_POLICY.floorMin) {
      newErrors['floor'] = copy.disputeForm.floorErrorMin
    } else if (floorNum > SP_POLICY.floorMax) {
      newErrors['floor'] = copy.disputeForm.floorErrorMax
    }
    if (ceiling) {
      const ceilNum = Number(ceiling)
      if (ceilNum > SP_POLICY.ceilingMax) {
        newErrors['ceiling'] = copy.disputeForm.ceilingErrorMax
      } else if (!newErrors['floor'] && ceilNum < floorNum) {
        newErrors['ceiling'] = copy.disputeForm.ceilingErrorBelowFloor
      }
    }
    if (!vendor) newErrors['vendor'] = copy.disputeForm.vendorError
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setSubmitting(true)
    try {
      const token = await getToken()
      if (!token) {
        setErrorMsg(copy.disputeForm.authError)
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
      setErrorMsg(
        err instanceof Error ? err.message : copy.disputeForm.genericError,
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-danger p-4 flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-fg">
          {copy.disputeForm.heading}
        </p>
        <p className="text-xs text-fg-muted mt-1">
          {copy.disputeForm.subheading}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SPNumberField
          id="dispute-floor"
          label={copy.disputeForm.floorLabel}
          value={floor}
          onChange={setFloor}
          placeholder={copy.disputeForm.floorPlaceholder}
          required
          error={errors['floor']}
        />
        <SPNumberField
          id="dispute-ceiling"
          label={copy.disputeForm.ceilingLabel}
          value={ceiling}
          onChange={setCeiling}
          placeholder={copy.disputeForm.ceilingPlaceholder}
          error={errors['ceiling']}
        />
      </div>

      <VendorField
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
          {copy.disputeForm.cancelButton}
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 h-11 rounded-xl bg-danger text-white font-semibold text-sm disabled:opacity-60"
        >
          {submitting
            ? copy.disputeForm.submittingButton
            : copy.disputeForm.submitButton}
        </button>
      </div>
    </div>
  )
}
