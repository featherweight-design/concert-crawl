'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { fileEventReport } from '@/lib/events'
import { REPORTING_COPY } from './definitions/copy'
import { REPORT_TOKENS } from './reportTokens'
import { ModalShell } from '@/components/consumer/modal-shell/ModalShell'

const copy = REPORTING_COPY.evidenceForm

const AZURE = 'oklch(0.62 0.12 240)'
const NOTES_MAX_CHARS = 280

// ── Evidence method type ──────────────────────────────────────────
type EvidenceMethod =
  | 'got_email'
  | 'saw_social'
  | 'venue_posted'
  | 'was_there'
  | 'something_else'

type ApiEvidenceMethod =
  | 'bought_myself'
  | 'saw_listing'
  | 'venue_site'
  | 'other'

const EVIDENCE_METHOD_TO_API: Record<EvidenceMethod, ApiEvidenceMethod> = {
  got_email: 'saw_listing',
  saw_social: 'saw_listing',
  venue_posted: 'venue_site',
  was_there: 'bought_myself',
  something_else: 'other',
}

type ReportType = 'sold-out' | 'cancelled' | 'postponed'

// ── Evidence option data ──────────────────────────────────────────
interface EvidenceOptionData {
  method: EvidenceMethod
  label: string
  description: string
}

const EVIDENCE_OPTIONS: EvidenceOptionData[] = [
  {
    method: 'got_email',
    label: copy.evidenceOptions.gotEmail.label,
    description: copy.evidenceOptions.gotEmail.description,
  },
  {
    method: 'saw_social',
    label: copy.evidenceOptions.sawSocial.label,
    description: copy.evidenceOptions.sawSocial.description,
  },
  {
    method: 'venue_posted',
    label: copy.evidenceOptions.venuePosted.label,
    description: copy.evidenceOptions.venuePosted.description,
  },
  {
    method: 'was_there',
    label: copy.evidenceOptions.wasThere.label,
    description: copy.evidenceOptions.wasThere.description,
  },
  {
    method: 'something_else',
    label: copy.evidenceOptions.somethingElse.label,
    description: copy.evidenceOptions.somethingElse.description,
  },
]

// ── EvidenceOption (internal) ─────────────────────────────────────
interface EvidenceOptionProps {
  option: EvidenceOptionData
  isSelected: boolean
  onSelect: (method: EvidenceMethod) => void
}

const EvidenceOption = ({
  option,
  isSelected,
  onSelect,
}: EvidenceOptionProps) => {
  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(option.method)}
      onKeyDown={(evt) => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault()
          onSelect(option.method)
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 14px',
        borderRadius: '10px',
        border: isSelected ? `1.5px solid ${AZURE}` : '1px solid var(--border)',
        background: isSelected
          ? `color-mix(in oklab, ${AZURE} 10%, transparent)`
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
            ? `2px solid ${AZURE}`
            : '1.5px solid var(--border)',
          background: isSelected ? AZURE : 'transparent',
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
          {option.label}
        </span>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            color: 'var(--fg-muted)',
            lineHeight: 1.4,
          }}
        >
          {option.description}
        </span>
      </div>
    </div>
  )
}

// ── Days until show ───────────────────────────────────────────────
const getDaysUntil = (eventDate: string): number => {
  const nowUtc = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
  )
  const eventUtc = new Date(eventDate).getTime()
  return Math.ceil((eventUtc - nowUtc) / (1000 * 60 * 60 * 24))
}

// ── Props ─────────────────────────────────────────────────────────
export interface EvidenceFormProps {
  open: boolean
  onClose: () => void
  reportType: ReportType
  eventId: string
  eventDate: string
  onSuccess?: () => void
}

// ── Main component ────────────────────────────────────────────────
export const EvidenceForm = ({
  open,
  onClose,
  reportType,
  eventId,
  eventDate,
  onSuccess,
}: EvidenceFormProps) => {
  const { getToken } = useAuth()
  const [selectedMethod, setSelectedMethod] = useState<EvidenceMethod | null>(
    null,
  )
  const [sourceUrl, setSourceUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const daysUntil = getDaysUntil(eventDate)
  const isImminent = daysUntil >= 0 && daysUntil < 7
  const tokens = REPORT_TOKENS[reportType]

  const handleSubmit = async () => {
    if (selectedMethod === null) return

    setSubmitting(true)
    setErrorMsg('')

    try {
      const token = await getToken()
      if (!token) {
        setErrorMsg('You must be signed in to file a report.')
        setSubmitting(false)
        return
      }

      await fileEventReport(
        eventId,
        {
          status: reportType,
          evidenceMethod: EVIDENCE_METHOD_TO_API[selectedMethod],
          ...(sourceUrl.trim() ? { evidenceUrl: sourceUrl.trim() } : {}),
          ...(notes.trim() ? { note: notes.trim() } : {}),
        },
        token,
      )

      onSuccess?.()
      onClose()
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Something went wrong. Try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel="Add evidence for your report"
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
        </>
      }
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => {
              void handleSubmit()
            }}
            disabled={selectedMethod === null || submitting}
            style={{
              background: tokens.color,
              height: 48,
              borderRadius: 10,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 800,
              fontSize: 14.5,
              color: 'var(--fg-on-accent)',
              border: 'none',
              cursor:
                selectedMethod !== null && !submitting
                  ? 'pointer'
                  : 'not-allowed',
              opacity: selectedMethod !== null && !submitting ? 1 : 0.45,
              width: '100%',
              transition: 'opacity 0.12s',
            }}
          >
            {submitting ? 'Submitting…' : copy.submitButton}
          </button>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase' as const,
              textAlign: 'center' as const,
              margin: 0,
            }}
          >
            Live after 2 fan confirms · or admin promotion
          </p>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Report type recap */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 8,
            background: 'color-mix(in oklab, var(--fg) 5%, transparent)',
            border: '1px solid var(--border)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            fontWeight: 700,
            color: tokens.color,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
          }}
        >
          {reportType === 'sold-out'
            ? 'Sold out'
            : reportType === 'cancelled'
              ? 'Cancelled'
              : 'Postponed'}
        </div>

        {isImminent && (
          <div
            style={{
              background: 'color-mix(in oklab, var(--warning) 8%, transparent)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              style={{ flexShrink: 0, marginTop: 1 }}
            >
              <path
                d="M8 2L14 13H2L8 2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M8 6.5V9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="8" cy="10.8" r="0.7" fill="currentColor" />
            </svg>
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                color: 'var(--fg-muted)',
                lineHeight: 1.5,
              }}
            >
              {copy.imminentWarning(daysUntil)}
            </span>
          </div>
        )}

        <div
          role="radiogroup"
          aria-label="Evidence method"
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {EVIDENCE_OPTIONS.map((opt) => (
            <EvidenceOption
              key={opt.method}
              option={opt}
              isSelected={selectedMethod === opt.method}
              onSelect={setSelectedMethod}
            />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: 12,
              color: 'var(--fg-muted)',
            }}
          >
            {copy.sourceLinkLabel}
          </label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(evt) => setSourceUrl(evt.target.value)}
            placeholder={copy.sourceLinkPlaceholder}
            style={{
              border: '1px solid var(--border-strong)',
              borderRadius: 10,
              padding: '8px 10px',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              color: 'var(--fg)',
              background: 'var(--surface-1)',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box' as const,
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <label
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: 12,
                color: 'var(--fg-muted)',
              }}
            >
              {copy.notesLabel}
            </label>
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 11,
                color: 'var(--fg-subtle)',
              }}
            >
              {copy.charCountSuffix(notes.length, NOTES_MAX_CHARS)}
            </span>
          </div>
          <textarea
            value={notes}
            onChange={(evt) => {
              if (evt.target.value.length <= NOTES_MAX_CHARS) {
                setNotes(evt.target.value)
              }
            }}
            placeholder={copy.notesPlaceholder}
            maxLength={NOTES_MAX_CHARS}
            style={{
              border: '1px solid var(--border-strong)',
              borderRadius: 10,
              padding: '8px 10px',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              color: 'var(--fg-subtle)',
              background: 'var(--surface-1)',
              outline: 'none',
              width: '100%',
              minHeight: 56,
              resize: 'vertical' as const,
              boxSizing: 'border-box' as const,
            }}
          />
        </div>

        {errorMsg && (
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              color: 'var(--danger)',
              margin: 0,
            }}
          >
            {errorMsg}
          </p>
        )}
      </div>
    </ModalShell>
  )
}
