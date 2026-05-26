'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { confirmEventReport } from '@/lib/events'
import { REPORT_TOKENS } from './reportTokens'
import { REPORTING_COPY } from './definitions/copy'

const copy = REPORTING_COPY.confirmReportSheet

// ── Helper ────────────────────────────────────────────────────────

const formatTimeAgo = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

// ── Glyphs (16×16) ────────────────────────────────────────────────

const CancelledGlyph16 = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 10 10"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="5"
      cy="5"
      r="4"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
    />
    <path
      d="M3 3 L7 7 M7 3 L3 7"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
)

const PostponedGlyph16 = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 10 10"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="5"
      cy="5"
      r="4"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
    />
    <path
      d="M5 3 L5 5 L6.5 6.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const SoldOutGlyph16 = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 10 10"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="1"
      y="2.5"
      width="8"
      height="5"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
    />
    <path
      d="M3.5 3.5 L6.5 6.5 M6.5 3.5 L3.5 6.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
)

const AvailableGlyph16 = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 10 10"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="1"
      y="2.5"
      width="8"
      height="5"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
    />
    <path
      d="M3.5 5 L4.5 6 L6.5 4"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
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
            fontWeight: 600,
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
  const { getToken } = useAuth()

  if (!open) return null

  const token = REPORT_TOKENS[reportType]
  const Glyph = GLYPHS_16[reportType]
  const timeAgo = formatTimeAgo(reportedAt)

  const attributionText =
    reporter !== null ? `@${reporter.handle}` : copy.recapCard.anonymousLabel

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

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col overflow-hidden"
        style={{
          maxWidth: '393px',
          margin: '0 auto',
          borderRadius: '18px 18px 0 0',
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          maxHeight: '820px',
        }}
      >
        {/* Drag handle */}
        <div
          style={{ position: 'relative', height: '20px', flexShrink: 0 }}
          aria-hidden="true"
        >
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '36px',
              height: '4px',
              borderRadius: '999px',
              background: 'var(--border-strong)',
            }}
          />
        </div>

        {/* Eyebrow / cancel row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px 0',
          }}
        >
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9px',
              color: 'var(--fg-subtle)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {copy.eyebrow}
          </span>
          <button
            onClick={onClose}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9px',
              color: 'var(--fg-subtle)',
              textTransform: 'uppercase',
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

        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 20px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Heading */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h2
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 900,
                fontSize: '24px',
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
                fontSize: '13.5px',
                color: 'var(--fg-muted)',
                margin: 0,
              }}
            >
              {copy.subtitle}
            </p>
          </div>

          {/* Recap card */}
          <div
            style={{
              borderRadius: '12px',
              background: token.bg,
              border: `1px solid ${token.border}`,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            {/* Icon container */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
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

            {/* Text */}
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
            >
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 800,
                  fontSize: '16px',
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
                  fontSize: '9px',
                  color: 'var(--fg-muted)',
                }}
              >
                {attributionText} · {timeAgo}
              </span>
            </div>
          </div>

          {/* Verify options */}
          <div
            role="radiogroup"
            aria-label="Confirmation method"
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
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
              borderRadius: '8px',
              padding: '10px 14px',
            }}
          >
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '9px',
                color: 'var(--fg-subtle)',
                lineHeight: 1.5,
              }}
            >
              {copy.cautionNote}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => {
              void handleConfirm()
            }}
            disabled={selectedMethod === null || isSubmitting}
            style={{
              background: token.color,
              height: '48px',
              borderRadius: '10px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 800,
              fontSize: '14.5px',
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
              padding: 0,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '13px',
              color: 'var(--fg-muted)',
              cursor: 'pointer',
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            {copy.counterReportLink}
          </button>
        </div>
      </div>
    </>
  )
}
