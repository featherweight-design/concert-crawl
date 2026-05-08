'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { SPNumberField } from './SPNumberField'
import { ChipGroup } from './ChipGroup'
import { validateSubmission, type SubmissionInput } from '@/lib/sp-policy'
import type {
  Event,
  SubmissionWithMeta,
  Tier,
  Vendor,
  HowFound,
} from '@concert-crawl/types'

type Phase = 'empty' | 'submitting' | 'success' | 'error' | 'alreadySubmitted'

interface SubmitFormProps {
  event: Event
  venueName: string
  initialAlreadySubmitted: boolean
  userSubmission: SubmissionWithMeta | null
}

const TIER_OPTIONS = [
  { value: 'GA', label: 'GA' },
  { value: 'Reserved', label: 'Reserved' },
  { value: 'VIP', label: 'VIP' },
  { value: 'Pit', label: 'Pit' },
  { value: 'Lawn', label: 'Lawn' },
]

const VENDOR_OPTIONS = [
  { value: 'AXS', label: 'AXS' },
  { value: 'Ticketmaster', label: 'Ticketmaster' },
  { value: 'SeatGeek', label: 'SeatGeek' },
  { value: 'DICE', label: 'DICE' },
  { value: 'Eventbrite', label: 'Eventbrite' },
  { value: 'VenueBoxOffice', label: 'Venue box office' },
]

const HOW_FOUND_OPTIONS = [
  { value: 'bought_myself', label: 'Bought it myself' },
  { value: 'saw_listing', label: 'Saw the listing' },
  { value: 'at_the_venue', label: 'At the venue' },
]

export function SubmitForm({
  event,
  venueName,
  initialAlreadySubmitted,
  userSubmission,
}: SubmitFormProps) {
  const router = useRouter()
  const { getToken } = useAuth()

  const [phase, setPhase] = useState<Phase>(
    initialAlreadySubmitted ? 'alreadySubmitted' : 'empty',
  )
  const [formState, setFormState] = useState<SubmissionInput>({
    floor: '',
    ceiling: '',
    tier: null,
    vendor: null,
    howFound: null,
  })
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({})
  const [fieldWarnings, setFieldWarnings] = useState<
    Partial<Record<string, string>>
  >({})
  const [errorMsg, setErrorMsg] = useState('')

  const dateStr = new Date(event.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Denver',
  })

  async function handleSubmit() {
    const validation = validateSubmission(formState)
    setFieldErrors(validation.errors)
    setFieldWarnings(validation.warnings)
    if (!validation.valid) return

    setPhase('submitting')
    try {
      const token = await getToken()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/events/${event.id}/price-submissions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            priceMin: Number(formState.floor),
            priceMax: formState.ceiling ? Number(formState.ceiling) : undefined,
            tier: formState.tier as Tier,
            vendor: formState.vendor as Vendor,
            howFound: formState.howFound as HowFound,
          }),
        },
      )
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        if (res.status === 409) {
          setPhase('alreadySubmitted')
          return
        }
        throw new Error(data.error ?? 'Submission failed')
      }
      setPhase('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
      setPhase('error')
    }
  }

  if (phase === 'success') {
    return (
      <div className="rounded-xl bg-success/10 border border-success p-5 flex flex-col gap-3">
        <div className="text-2xl">✓</div>
        <p className="text-base font-semibold text-fg">Got it. Thanks.</p>
        <p className="text-sm text-fg-muted">
          Your price is in. It&apos;ll show up tagged <strong>pending</strong>{' '}
          until 2 other fans corroborate it.
        </p>
        <button
          onClick={() => router.push(`/events/${event.id}`)}
          className="mt-2 text-sm text-signal underline"
        >
          Back to show
        </button>
      </div>
    )
  }

  if (phase === 'alreadySubmitted' && userSubmission) {
    return (
      <div className="rounded-xl border border-border p-4 flex flex-col gap-3 bg-surface-1">
        <p className="text-sm font-semibold text-fg">
          You already submitted a price.
        </p>
        <p className="text-xs text-fg-muted font-mono">
          ${userSubmission.priceMin}
          {userSubmission.priceMax
            ? ` – $${userSubmission.priceMax}`
            : ''} · {userSubmission.tier} · {userSubmission.vendor}
        </p>
        <p className="text-xs text-fg-subtle">
          You can submit one price per show every 24h.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPhase('empty')}
            className="text-xs text-signal underline"
          >
            Edit
          </button>
          <span className="text-fg-subtle text-xs">·</span>
          <button
            onClick={async () => {
              const token = await getToken()
              await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/v1/submissions/${userSubmission.id}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                },
              )
              router.refresh()
            }}
            className="text-xs text-danger underline"
          >
            Withdraw
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Context header */}
      <div className="flex flex-col gap-0.5">
        <p className="text-xs font-bold uppercase tracking-widest font-mono text-fg-muted">
          Submit a price
        </p>
        <p className="text-lg font-bold text-fg">{event.artist}</p>
        <p className="text-sm text-fg-muted font-mono">
          {venueName} · {dateStr}
        </p>
      </div>

      {/* Anti-abuse banner */}
      <div className="flex items-start gap-2 rounded-lg bg-surface-2 border border-border p-3">
        <span className="text-base">🛡</span>
        <p className="text-xs text-fg-muted">
          Prices are capped at <strong>$2000</strong>. Submissions stay{' '}
          <em>pending</em> until 2 fans confirm.
        </p>
      </div>

      {/* Floor + Ceiling */}
      <div className="grid grid-cols-2 gap-3">
        <SPNumberField
          label="Floor *"
          value={formState.floor}
          onChange={(val) => setFormState((prev) => ({ ...prev, floor: val }))}
          placeholder="35"
          required
          error={fieldErrors['floor']}
          warning={fieldWarnings['floor']}
        />
        <SPNumberField
          label="Ceiling"
          value={formState.ceiling}
          onChange={(val) =>
            setFormState((prev) => ({ ...prev, ceiling: val }))
          }
          placeholder="75"
          error={fieldErrors['ceiling']}
        />
      </div>

      {/* Tier */}
      <ChipGroup
        label="Tier *"
        options={TIER_OPTIONS}
        value={formState.tier}
        onChange={(val) => setFormState((prev) => ({ ...prev, tier: val }))}
        error={fieldErrors['tier']}
      />

      {/* Vendor */}
      <ChipGroup
        label="Where it's listed *"
        options={VENDOR_OPTIONS}
        value={formState.vendor}
        onChange={(val) => setFormState((prev) => ({ ...prev, vendor: val }))}
        error={fieldErrors['vendor']}
      />

      {/* HowFound */}
      <ChipGroup
        label="How you found out *"
        options={HOW_FOUND_OPTIONS}
        value={formState.howFound}
        onChange={(val) => setFormState((prev) => ({ ...prev, howFound: val }))}
        error={fieldErrors['howFound']}
      />

      {/* Error state */}
      {phase === 'error' && <p className="text-xs text-danger">{errorMsg}</p>}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={phase === 'submitting'}
        className="w-full h-[50px] rounded-xl bg-signal text-bg font-bold text-base shadow-[0_0_16px_rgba(0,255,255,0.25)] disabled:opacity-60"
      >
        {phase === 'submitting' ? 'Submitting…' : 'Submit price'}
      </button>

      {/* Footer hint */}
      <p className="text-xs text-fg-subtle text-center">
        Anonymous to other fans. Goes out as <em>pending</em> until 2 confirm.
        Rate-limited at 1 per show per 24h.
      </p>
    </div>
  )
}
