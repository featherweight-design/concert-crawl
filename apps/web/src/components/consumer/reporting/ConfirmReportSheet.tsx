'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { confirmEventReport } from '@/lib/events'
import { REPORT_TOKENS } from './reportTokens'
import { REPORTING_COPY } from './definitions/copy'
import { ModalShell } from '@/components/consumer/modal-shell/ModalShell'
import { TierPickerSheet } from '@/components/consumer/tier-picker/TierPickerSheet'
import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants'

const copy = REPORTING_COPY.confirmReportSheet

// ── Glyphs (16×16) ────────────────────────────────────────────────

const CancelledGlyph16 = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3 3l6 6M9 3L3 9"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
)

const PostponedGlyph16 = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="6"
      cy="6"
      r="4.5"
      stroke="currentColor"
      strokeWidth="1.3"
      fill="none"
    />
    <path
      d="M6 3.5V6l2 1.4"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const SoldOutGlyph16 = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="6"
      cy="6"
      r="4.5"
      stroke="currentColor"
      strokeWidth="1.4"
      fill="none"
    />
    <path
      d="M3.5 8.5L8.5 3.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
)

const AvailableGlyph16 = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2 5a1.5 1.5 0 010 3v2h8V8a1.5 1.5 0 010-3V3H2v2z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <path
      d="M5 5v3"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeDasharray="1.2 1.6"
    />
  </svg>
)

type ConfirmReportType = 'sold-out' | 'cancelled' | 'postponed' | 'available'

const GLYPHS_16: Record<ConfirmReportType, () => React.JSX.Element> = {
  cancelled: CancelledGlyph16,
  postponed: PostponedGlyph16,
  'sold-out': SoldOutGlyph16,
  available: AvailableGlyph16,
}

// ── Verify option types ───────────────────────────────────────────

type VerifyMethod = 'saw_same_source' | 'own_evidence' | 'heard_from_venue'

// ── Sub-component: VerifyOption ───────────────────────────────────

interface VerifyOptionProps {
  method: VerifyMethod
  label: string
  description: string
  isSelected: boolean
  accentColor: string
  onSelect: (method: VerifyMethod) => void
}

const VerifyOption = ({
  method,
  label,
  description,
  isSelected,
  accentColor,
  onSelect,
}: VerifyOptionProps) => {
  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(method)}
      onKeyDown={(evt) => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault()
          onSelect(method)
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 14px',
        borderRadius: '10px',
        border: isSelected
          ? `1.5px solid ${accentColor}`
          : '1px solid var(--border)',
        background: isSelected
          ? `color-mix(in oklab, ${accentColor} 10%, transparent)`
          : 'var(--surface-1)',
        cursor: 'pointer',
        transition: 'border-color 0.12s, background 0.12s',
      }}
    >
      {/* Radio dot */}
      <div
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          flexShrink: 0,
          marginTop: '2px',
          border: isSelected
            ? `2px solid ${accentColor}`
            : '1.5px solid var(--border)',
          background: isSelected ? accentColor : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isSelected && (
          <svg
            width="9"
            height="7"
            viewBox="0 0 9 7"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 3.5L3.5 6L8 1"
              stroke="var(--fg-on-accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize: '13.5px',
            color: 'var(--fg)',
            lineHeight: 1.3,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            color: 'var(--fg-muted)',
            lineHeight: 1.4,
          }}
        >
          {description}
        </span>
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────

export interface ConfirmReportSheetProps {
  open: boolean
  onClose: () => void
  reportType: ConfirmReportType
  reporter: { handle: string; url: string } | null
  reportedAt: string
  eventId: string
  reportId: string
  onSuccess?: () => void
  onFileCounter: () => void
}

// ── Component ─────────────────────────────────────────────────────

export const ConfirmReportSheet = ({
  open,
  onClose,
  reportType,
  reporter,
  reportedAt,
  eventId,
  reportId,
  onSuccess,
  onFileCounter,
}: ConfirmReportSheetProps) => {
  const [selectedMethod, setSelectedMethod] = useState<VerifyMethod | null>(
    null,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const token = REPORT_TOKENS[reportType]
  const Glyph = GLYPHS_16[reportType]

  const attributionText =
    reporter !== null ? `by ${reporter.handle}` : copy.recapCard.anonymousLabel

  const verifyOptions: Array<{
    method: VerifyMethod
    label: string
    description: string
  }> = [
    {
      method: 'saw_same_source',
      label: copy.verifyOptions.sawSameSource.label,
      description: copy.verifyOptions.sawSameSource.description,
    },
    {
      method: 'own_evidence',
      label: copy.verifyOptions.ownEvidence.label,
      description: copy.verifyOptions.ownEvidence.description,
    },
    {
      method: 'heard_from_venue',
      label: copy.verifyOptions.heardFromVenue.label,
      description: copy.verifyOptions.heardFromVenue.description,
    },
  ]

  const handleConfirm = async () => {
    if (selectedMethod === null) return

    setIsSubmitting(true)
    try {
      const authToken = await getToken()
      if (authToken === null) return
      await confirmEventReport(eventId, reportId, authToken)
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Failed to confirm report:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Same gate as ReportSheet: signed out, `getToken()` returned null and
  // handleConfirm bailed without telling anyone, so the confirm button looked
  // broken. Confirming is free, so the reach goes to the picker instead.
  if (open && isLoaded && !isSignedIn) {
    return (
      <TierPickerSheet
        open
        onClose={onClose}
        planState={LOGGED_OUT_PLAN_STATE}
        // No payment element is reachable signed out; `true` only adds legal
        // copy, matching the other logged-out picker call-sites.
        scaRegion
        entry="logged-out-report"
      />
    )
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel="Confirm community report"
      sheetHeight="tall"
      header={
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                color: 'var(--fg-subtle)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.08em',
              }}
            >
              {copy.eyebrow}
            </span>
            <button
              onClick={onClose}
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                color: 'var(--fg-subtle)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.08em',
                background: 'none',
                border: 'none',
                padding: '4px 0',
                cursor: 'pointer',
              }}
            >
              {copy.cancelButton}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 900,
                fontSize: 24,
                letterSpacing: '-0.025em',
                color: 'var(--fg)',
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {copy.heading}
            </h2>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 13.5,
                color: 'var(--fg-muted)',
                margin: 0,
              }}
            >
              {copy.subtitle}
            </p>
          </div>
        </>
      }
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => {
              void handleConfirm()
            }}
            disabled={selectedMethod === null || isSubmitting}
            style={{
              background: token.color,
              height: 48,
              borderRadius: 10,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 800,
              fontSize: 14.5,
              color: 'var(--fg-on-accent)',
              border: 'none',
              cursor:
                selectedMethod !== null && !isSubmitting
                  ? 'pointer'
                  : 'not-allowed',
              opacity: selectedMethod !== null && !isSubmitting ? 1 : 0.45,
              width: '100%',
              transition: 'opacity 0.12s',
            }}
          >
            {copy.confirmButton}
          </button>
          <button
            onClick={onFileCounter}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 0',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--fg-muted)',
              cursor: 'pointer',
              textAlign: 'center' as const,
              lineHeight: 1.4,
            }}
          >
            {copy.counterReportLink}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Recap card */}
        <div
          style={{
            borderRadius: 12,
            background: token.bg,
            border: `1px solid ${token.border}`,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: token.bgStrong,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: token.color,
            }}
          >
            <Glyph />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                fontSize: 16,
                color: 'var(--fg)',
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
              }}
            >
              {token.label}
            </span>
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                color: 'var(--fg-muted)',
              }}
            >
              {attributionText} · {reportedAt}
            </span>
          </div>
        </div>

        {/* Verify options */}
        <div
          role="radiogroup"
          aria-label={copy.methodGroupAriaLabel}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {verifyOptions.map((opt) => (
            <VerifyOption
              key={opt.method}
              method={opt.method}
              label={opt.label}
              description={opt.description}
              isSelected={selectedMethod === opt.method}
              accentColor={token.color}
              onSelect={setSelectedMethod}
            />
          ))}
        </div>

        {/* Caution note */}
        <div
          style={{
            background: 'color-mix(in oklab, var(--fg) 3%, transparent)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '10px 12px',
          }}
        >
          <span
            style={{
              fontFamily: 'Inter, system-ui',
              fontSize: 12,
              color: 'var(--fg-subtle)',
              lineHeight: 1.5,
            }}
          >
            {copy.cautionNote}
          </span>
        </div>
      </div>
    </ModalShell>
  )
}
