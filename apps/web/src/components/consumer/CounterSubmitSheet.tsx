'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { SPNumberField } from './SPNumberField'
import { ChipGroup } from './ChipGroup'
import { ArrowGlyph } from './glyphs'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { SP_POLICY } from '@concert-crawl/types'
import type { Tier, Vendor } from '@concert-crawl/types'

const copy = CONSUMER_COPY.counterSubmitSheet

const TIER_OPTIONS: { value: string; label: string }[] = [
  { value: 'GA', label: 'GA' },
  { value: 'Reserved', label: 'Reserved' },
  { value: 'VIP', label: 'VIP' },
]

const VENDOR_OPTIONS: { value: string; label: string }[] = [
  { value: 'Ticketmaster', label: 'Ticketmaster' },
  { value: 'AXS', label: 'AXS' },
  { value: 'SeatGeek', label: 'SeatGeek' },
  { value: 'DICE', label: 'DICE' },
  { value: 'VenueBoxOffice', label: 'Venue' },
]

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
}

const validateForm = (
  floor: string,
  ceiling: string,
  tier: string | null,
  vendor: string | null,
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

  return errors
}

const isValidTier = (value: string): value is Tier => {
  const validTiers: Tier[] = ['GA', 'Reserved', 'VIP', 'Pit', 'Lawn']
  return validTiers.includes(value as Tier)
}

const isValidVendor = (value: string): value is Vendor => {
  const validVendors: Vendor[] = [
    'AXS',
    'Ticketmaster',
    'SeatGeek',
    'DICE',
    'Eventbrite',
    'VenueBoxOffice',
  ]
  return validVendors.includes(value as Vendor)
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
  const [vendor, setVendor] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})

  const isFormReady =
    floor.trim().length > 0 && tier !== null && vendor !== null

  const subtitle =
    currentCeiling != null
      ? copy.subtitleWithRange(currentFloor, currentCeiling, currentVendor)
      : copy.subtitleFloorOnly(currentFloor, currentVendor)

  const handleSubmit = useCallback(async () => {
    const errors = validateForm(floor, ceiling, tier, vendor)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    if (!tier || !vendor) return

    const resolvedTier = isValidTier(tier) ? tier : 'GA'
    const resolvedVendor = isValidVendor(vendor) ? vendor : 'Ticketmaster'

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
            vendor: resolvedVendor,
            disputedSubmissionId,
          }),
        },
      )
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? 'Submission failed')
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
    setFieldErrors({})
    onClose()
  }, [onClose])

  if (!open) return null

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        style={{ maxHeight: '85vh' }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-[20px] bg-bg overflow-hidden"
      >
        {/* Grabber */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border-strong" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 border-b border-border flex-shrink-0">
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
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
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
                    marginTop: '8px',
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

              {/* Vendor chips */}
              <ChipGroup
                label={copy.vendorLabel}
                options={VENDOR_OPTIONS}
                value={vendor}
                onChange={setVendor}
                error={fieldErrors.vendor}
              />
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {(sheetState === 'form' || sheetState === 'submitting') && (
          <div className="px-5 pb-8 pt-3 border-t border-border flex-shrink-0">
            <div
              style={{
                marginTop: '18px',
                padding: '10px 12px',
                background: 'color-mix(in oklab, var(--fg) 3%, transparent)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9px',
                color: 'var(--fg-subtle)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              {copy.honestyDisclaimer}
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormReady || sheetState === 'submitting'}
              style={{
                all: 'unset',
                cursor:
                  !isFormReady || sheetState === 'submitting'
                    ? 'not-allowed'
                    : 'pointer',
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
                opacity: !isFormReady || sheetState === 'submitting' ? 0.45 : 1,
                transition: 'opacity .12s',
                marginTop: '12px',
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
          </div>
        )}
      </div>
    </>
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
