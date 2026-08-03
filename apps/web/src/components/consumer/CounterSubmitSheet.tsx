'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { SPNumberField } from './SPNumberField'
import { ChipGroup } from './ChipGroup'
import { ArrowGlyph } from './glyphs'
import { ModalShell } from '@/components/consumer/modal-shell/ModalShell'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { VendorField } from '@/components/consumer/submit-price/VendorField'
import { apiErrorMessage } from '@/components/consumer/lib/api-error-message'
import { SP_POLICY } from '@concert-crawl/types'
import type { Tier, Vendor } from '@concert-crawl/types'

const copy = CONSUMER_COPY.counterSubmitSheet

const TIER_OPTIONS: { value: string; label: string }[] = [
  { value: 'GA', label: 'GA' },
  { value: 'Reserved', label: 'Reserved' },
  { value: 'VIP', label: 'VIP' },
  { value: 'Pit', label: 'Pit' },
  { value: 'Lawn', label: 'Lawn' },
]

type HowFound = 'bought_myself' | 'saw_listing' | 'at_the_venue'

const HOW_FOUND_OPTIONS: { value: HowFound; label: string }[] = [
  { value: 'bought_myself', label: 'Bought it myself' },
  { value: 'saw_listing', label: 'Saw the listing' },
  { value: 'at_the_venue', label: 'At the venue' },
]

const isValidHowFound = (value: string): value is HowFound =>
  HOW_FOUND_OPTIONS.some((opt) => opt.value === value)

type SheetState = 'form' | 'submitting' | 'success' | 'error'

export interface CounterSubmitSheetProps {
  open: boolean
  onClose: () => void
  eventId: string
  disputedSubmissionId: string
  currentFloor: number
  currentCeiling?: number
  currentVendor: string
  onSuccess?: () => void
}

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? ''

interface FormErrors {
  floor?: string
  ceiling?: string
  tier?: string
  vendor?: string
  howFound?: string
}

const validateForm = (
  floor: string,
  ceiling: string,
  tier: string | null,
  vendor: string | null,
  howFound: string | null,
): FormErrors => {
  const errors: FormErrors = {}
  const floorNum = Number(floor)

  if (!floor || isNaN(floorNum) || floorNum < SP_POLICY.floorMin) {
    errors.floor = 'Has to be at least $1.'
  } else if (floorNum > SP_POLICY.floorMax) {
    errors.floor = 'Cap is $2,000.'
  }

  if (ceiling) {
    const ceilingNum = Number(ceiling)
    if (isNaN(ceilingNum) || ceilingNum > SP_POLICY.ceilingMax) {
      errors.ceiling = 'Cap is $2,000.'
    } else if (!errors.floor && ceilingNum < floorNum) {
      errors.ceiling = "Ceiling can't be below floor."
    }
  }

  if (!tier) errors.tier = 'Pick a tier.'
  if (!vendor) errors.vendor = "Pick where it's listed."
  if (!howFound) errors.howFound = 'Tell us how you found out.'

  return errors
}

const isValidTier = (value: string): value is Tier => {
  const validTiers: Tier[] = ['GA', 'Reserved', 'VIP', 'Pit', 'Lawn']
  return validTiers.includes(value as Tier)
}

export function CounterSubmitSheet({
  open,
  onClose,
  eventId,
  disputedSubmissionId,
  currentFloor,
  currentCeiling,
  currentVendor,
  onSuccess,
}: CounterSubmitSheetProps) {
  const { getToken } = useAuth()
  const router = useRouter()

  const [sheetState, setSheetState] = useState<SheetState>('form')
  const [floor, setFloor] = useState('')
  const [ceiling, setCeiling] = useState('')
  const [tier, setTier] = useState<string | null>(null)
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [howFound, setHowFound] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})

  const subtitle =
    currentCeiling != null
      ? copy.subtitleWithRange(currentFloor, currentCeiling, currentVendor)
      : copy.subtitleFloorOnly(currentFloor, currentVendor)

  const handleSubmit = useCallback(async () => {
    const errors = validateForm(floor, ceiling, tier, vendor, howFound)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    if (!tier || !vendor || !howFound) return

    const resolvedTier = isValidTier(tier) ? tier : 'GA'
    const resolvedHowFound: HowFound = isValidHowFound(howFound)
      ? howFound
      : 'saw_listing'

    setSheetState('submitting')
    try {
      const token = await getToken()
      if (!token) {
        setSheetState('error')
        return
      }
      const res = await fetch(
        `${API_URL}/v1/events/${eventId}/price-submissions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            priceMin: Number(floor),
            priceMax: ceiling ? Number(ceiling) : undefined,
            tier: resolvedTier,
            vendor,
            howFound: resolvedHowFound,
            disputedSubmissionId,
          }),
        },
      )
      if (!res.ok) {
        throw new Error(
          apiErrorMessage(await res.json().catch(() => null)) ??
            'Submission failed',
        )
      }
      router.refresh()
      setSheetState('success')
    } catch (err) {
      console.error('CounterSubmitSheet: price update failed', err)
      setSheetState('error')
    }
  }, [
    floor,
    ceiling,
    tier,
    vendor,
    howFound,
    getToken,
    eventId,
    disputedSubmissionId,
    router,
  ])

  const handleSuccess = useCallback(() => {
    onSuccess?.()
    onClose()
  }, [onSuccess, onClose])

  const handleReset = useCallback(() => {
    setSheetState('form')
    setFieldErrors({})
  }, [])

  const handleClose = useCallback(() => {
    setSheetState('form')
    setFloor('')
    setCeiling('')
    setTier(null)
    setVendor(null)
    setHowFound(null)
    setFieldErrors({})
    onClose()
  }, [onClose])

  const headerNode = (
    <>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {copy.eyebrow}
      </p>
      <p
        style={{
          margin: '4px 0 0',
          fontFamily: 'var(--font-ui)',
          fontSize: 24,
          fontWeight: 900,
          color: 'var(--fg)',
          letterSpacing: '-0.025em',
          lineHeight: 1.15,
        }}
      >
        {copy.heading}
      </p>
      <p
        style={{
          margin: '6px 0 0',
          fontFamily: 'var(--font-ui)',
          fontSize: 13.5,
          color: 'var(--fg-muted)',
          lineHeight: 1.5,
        }}
      >
        {subtitle}
      </p>
    </>
  )

  const footerNode =
    sheetState === 'form' || sheetState === 'submitting' ? (
      <>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={sheetState === 'submitting'}
          style={{
            all: 'unset',
            cursor: sheetState === 'submitting' ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            height: 48,
            width: '100%',
            boxSizing: 'border-box',
            background: 'var(--signal)',
            color: 'var(--fg-on-accent)',
            borderRadius: 10,
            fontFamily: 'var(--font-ui)',
            fontWeight: 800,
            fontSize: 14.5,
            letterSpacing: '-0.005em',
            opacity: sheetState === 'submitting' ? 0.45 : 1,
            transition: 'opacity .12s',
          }}
        >
          <ArrowGlyph size={13} />
          {sheetState === 'submitting'
            ? copy.submittingButton
            : copy.submitButton}
        </button>
        <p
          style={{
            marginTop: '10px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            color: 'var(--fg-subtle)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          {copy.footerDisclaimer}
        </p>
      </>
    ) : undefined

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      ariaLabel={copy.heading}
      sheetHeight="tall"
      header={headerNode}
      footer={footerNode}
    >
      {sheetState === 'success' && <SuccessState onClose={handleSuccess} />}

      {sheetState === 'error' && (
        <ErrorState onReset={handleReset} onClose={handleClose} />
      )}

      {(sheetState === 'form' || sheetState === 'submitting') && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            opacity: sheetState === 'submitting' ? 0.6 : 1,
            pointerEvents: sheetState === 'submitting' ? 'none' : 'auto',
          }}
        >
          {/* Price fields */}
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              <SPNumberField
                id="counter-floor"
                label={copy.floorLabel}
                value={floor}
                onChange={setFloor}
                placeholder={copy.floorPlaceholder}
                required
                error={fieldErrors.floor}
              />
              <SPNumberField
                id="counter-ceiling"
                label={copy.ceilingLabel}
                value={ceiling}
                onChange={setCeiling}
                placeholder={copy.ceilingPlaceholder}
                error={fieldErrors.ceiling}
              />
            </div>
            <p
              style={{
                fontFamily: 'Inter, system-ui',
                fontSize: '11.5px',
                color: 'var(--fg-subtle)',
                lineHeight: 1.4,
                margin: '8px 0 0',
              }}
            >
              {copy.ceilingHint}
            </p>
          </div>

          {/* Tier chips */}
          <ChipGroup
            label={copy.tierLabel}
            options={TIER_OPTIONS}
            value={tier}
            onChange={setTier}
            error={fieldErrors.tier}
          />

          <VendorField
            value={vendor}
            onChange={setVendor}
            error={fieldErrors.vendor}
          />

          {/* How found chips */}
          <ChipGroup
            label={copy.howFoundLabel}
            options={HOW_FOUND_OPTIONS}
            value={howFound}
            onChange={setHowFound}
            error={fieldErrors.howFound}
          />

          {/* Honesty disclaimer */}
          <div
            style={{
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
              padding: '10px 12px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.04em',
              lineHeight: 1.6,
              textTransform: 'uppercase' as const,
            }}
          >
            {copy.honestyFootnote}
          </div>
        </div>
      )}
    </ModalShell>
  )
}

// ── Sub-views ────────────────────────────────────────────────────────────────

function SuccessState({ onClose }: { onClose: () => void }) {
  const copy = CONSUMER_COPY.counterSubmitSheet
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '8px 0',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          lineHeight: 1.0,
          color: 'var(--fg)',
        }}
      >
        {copy.successHeading}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
        }}
      >
        {copy.successBody}
      </p>
      <button
        type="button"
        onClick={onClose}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 48,
          width: '100%',
          boxSizing: 'border-box',
          background: 'var(--signal)',
          color: 'var(--fg-on-accent)',
          borderRadius: 10,
          fontFamily: 'var(--font-ui)',
          fontWeight: 800,
          fontSize: 14.5,
          letterSpacing: '-0.005em',
          marginTop: 4,
        }}
      >
        {copy.successBackButton}
      </button>
    </div>
  )
}

function ErrorState({
  onReset,
  onClose,
}: {
  onReset: () => void
  onClose: () => void
}) {
  const copy = CONSUMER_COPY.counterSubmitSheet
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '8px 0',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          lineHeight: 1.0,
          color: 'var(--fg)',
        }}
      >
        {copy.errorHeading}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
        }}
      >
        {copy.errorBody}
      </p>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginTop: 4,
        }}
      >
        <button
          type="button"
          onClick={onReset}
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 48,
            width: '100%',
            boxSizing: 'border-box',
            background: 'var(--signal)',
            color: 'var(--fg-on-accent)',
            borderRadius: 10,
            fontFamily: 'var(--font-ui)',
            fontWeight: 800,
            fontSize: 14.5,
            letterSpacing: '-0.005em',
          }}
        >
          {copy.errorTryAgainButton}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 44,
            width: '100%',
            boxSizing: 'border-box',
            color: 'var(--fg-muted)',
            fontFamily: 'var(--font-ui)',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '-0.005em',
          }}
        >
          {copy.errorCloseButton}
        </button>
      </div>
    </div>
  )
}
