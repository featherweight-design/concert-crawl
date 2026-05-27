'use client'

import { useState } from 'react'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { CheckGlyph, LockGlyph, PendingTrustPill } from './glyphs'
import { ModalShell } from '@/components/consumer/modal-shell/ModalShell'

const copy = CONSUMER_COPY.corroborationSheet

// ── Helpers ──────────────────────────────────────────────────────
const vendorDisplayName = (vendor: string): string =>
  vendor === 'VenueBoxOffice' ? 'Venue box office' : vendor

const formatTimeAgo = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

// ── Color constants ──────────────────────────────────────────────
const AZURE = 'oklch(0.62 0.12 240)'
const GOLD = 'oklch(0.66 0.14 78)'

// ── Token shape ──────────────────────────────────────────────────
interface PendingTokens {
  color: string
  bg: string
  border: string
}

const pendingTokens = (kind: 'community' | 'boxoffice'): PendingTokens => {
  if (kind === 'community') {
    return {
      color: AZURE,
      bg: `color-mix(in oklab, ${AZURE} 6%, var(--surface-1))`,
      border: `color-mix(in oklab, ${AZURE} 32%, var(--border))`,
    }
  }

  return {
    color: GOLD,
    bg: `color-mix(in oklab, ${GOLD} 8%, var(--surface-1))`,
    border: `color-mix(in oklab, ${GOLD} 38%, var(--border))`,
  }
}

// ── Verify option type ────────────────────────────────────────────
type VerifyMethod =
  | 'same_vendor'
  | 'other_vendor'
  | 'saw_listing'
  | 'bought_myself'

type ApiConfirmMethod = 'same-vendor' | 'other-vendor' | 'box-office'

const VERIFY_METHOD_TO_API: Record<VerifyMethod, ApiConfirmMethod> = {
  same_vendor: 'same-vendor',
  other_vendor: 'other-vendor',
  saw_listing: 'box-office',
  bought_myself: 'box-office',
}

// ── Props ────────────────────────────────────────────────────────
export interface CorroborationSheetProps {
  submission: {
    floor: number
    ceiling?: number
    tier: string
    vendor: string
    kind: 'community' | 'boxoffice'
    submitter: { handle: string; url: string } | null
    submittedAt: string
    confirms: number
    needed: number
    note?: string | null
    submissionId: string
  }
  open: boolean
  isSelfLocked?: boolean
  onClose: () => void
  onConfirm: (method: ApiConfirmMethod) => void
  onWithdraw?: () => void
  onSubmitUpdate: () => void
}

// ── Sub-component: SubmissionDetailCard ──────────────────────────
interface SubmissionDetailCardProps {
  floor: number
  ceiling?: number
  tier: string
  vendor: string
  kind: 'community' | 'boxoffice'
  submitter: { handle: string; url: string } | null
  submittedAt: string
  note?: string | null | undefined
  accentColor: string
}

const SubmissionDetailCard = ({
  floor,
  ceiling,
  tier,
  vendor,
  kind,
  submitter,
  submittedAt,
  note,
  accentColor,
}: SubmissionDetailCardProps) => {
  const tokens = pendingTokens(kind)

  const byNode = (() => {
    if (submitter === null) {
      return (
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            color: 'var(--fg-muted)',
          }}
        >
          {copy.vendorLabel === 'VENDOR'
            ? copy.viaAnonymous
            : copy.viaAnonymous}
        </span>
      )
    }
    return (
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          color: 'var(--fg-muted)',
        }}
      >
        {copy.viaHandlePrefix}
        {submitter.handle}
      </span>
    )
  })()

  const labelStyle = {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '9px',
    color: 'var(--fg-subtle)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  }
  const valueStyle = {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '10px',
    color: 'var(--fg)',
  }

  return (
    <div
      style={{
        background: tokens.bg,
        border: `1px solid ${tokens.border}`,
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Price + tier + chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 800,
              fontSize: '30px',
              color: 'var(--fg)',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
            }}
          >
            {ceiling !== undefined && ceiling > floor
              ? `$${floor}–$${ceiling}`
              : `$${floor}`}
          </span>
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              color: 'var(--fg-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            {tier}
          </span>
          <PendingTrustPill kind={kind} />
        </div>

        {/* VENDOR / BY / WHEN rows */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '4px 12px',
          }}
        >
          <span style={labelStyle}>{copy.vendorLabel}</span>
          <span style={valueStyle}>{vendorDisplayName(vendor)}</span>
          <span style={labelStyle}>{copy.byLabel}</span>
          <span style={valueStyle}>{byNode}</span>
          <span style={labelStyle}>{copy.whenLabel}</span>
          <span style={valueStyle}>{formatTimeAgo(submittedAt)}</span>
        </div>

        {/* Box-office face-value note */}
        {kind === 'boxoffice' && (
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '12px',
              color: accentColor,
            }}
          >
            face value · no fees
          </span>
        )}

        {/* Submission note */}
        {note != null && note !== '' && (
          <div
            style={{
              padding: '8px 10px',
              background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
            }}
          >
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontStyle: 'italic',
                fontSize: '13px',
                color: 'var(--fg-muted)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              &ldquo;{note}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-component: VerifyOption row ──────────────────────────────
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

// ── Main component ────────────────────────────────────────────────
export const CorroborationSheet = ({
  submission,
  open,
  isSelfLocked = false,
  onClose,
  onConfirm,
  onWithdraw,
  onSubmitUpdate,
}: CorroborationSheetProps) => {
  const [selectedMethod, setSelectedMethod] = useState<VerifyMethod | null>(
    null,
  )

  const accentColor = submission.kind === 'boxoffice' ? GOLD : AZURE

  const isBoxOfficeSubmission = submission.kind === 'boxoffice'

  const verifyOptions: Array<{
    method: VerifyMethod
    label: string
    description: string
  }> = [
    {
      method: 'same_vendor',
      label: isBoxOfficeSubmission
        ? copy.options.sameVendor.boxOfficeLabel
        : copy.options.sameVendor.label(submission.vendor),
      description: isBoxOfficeSubmission
        ? copy.options.sameVendor.boxOfficeDescription
        : copy.options.sameVendor.description(submission.vendor),
    },
    {
      method: 'other_vendor',
      label: copy.options.otherVendor.label,
      description: copy.options.otherVendor.description,
    },
    {
      method: 'saw_listing',
      label: copy.options.sawListing.label,
      description: copy.options.sawListing.description,
    },
    ...(!isBoxOfficeSubmission
      ? [
          {
            method: 'bought_myself' as VerifyMethod,
            label: copy.options.boughtMyself.label,
            description: copy.options.boughtMyself.description,
          },
        ]
      : []),
  ]

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel="Corroborate price submission"
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
              {copy.heading(submission.floor, submission.ceiling)}
            </h2>
            {!isSelfLocked && (
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
            )}
          </div>
        </>
      }
      footer={
        isSelfLocked ? (
          /* Self-locked footer: Edit + Withdraw */
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <button
              onClick={onSubmitUpdate}
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-strong)',
                borderRadius: 10,
                height: 44,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: 13.5,
                color: 'var(--fg)',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              {copy.selfLocked.editButton}
            </button>
            <button
              onClick={onWithdraw ?? onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--warning)',
                borderRadius: 10,
                height: 44,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: 13.5,
                color: 'var(--warning)',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              {copy.selfLocked.withdrawButton}
            </button>
          </div>
        ) : (
          /* Fresh state footer: Confirm CTA + escape link + disclaimer */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => {
                if (selectedMethod !== null) {
                  onConfirm(VERIFY_METHOD_TO_API[selectedMethod])
                }
              }}
              disabled={selectedMethod === null}
              style={{
                background: accentColor,
                height: 48,
                borderRadius: 10,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                fontSize: 14.5,
                color: 'var(--fg-on-accent)',
                border: 'none',
                cursor: selectedMethod !== null ? 'pointer' : 'not-allowed',
                opacity: selectedMethod !== null ? 1 : 0.45,
                width: '100%',
                transition: 'opacity 0.12s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <CheckGlyph size={13} color="var(--fg-on-accent)" />
              {copy.confirmButton}
            </button>
            <button
              onClick={onSubmitUpdate}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 0',
                width: '100%',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: 13,
                color: 'var(--fg-muted)',
                cursor: 'pointer',
                textAlign: 'center' as const,
                lineHeight: 1.4,
              }}
            >
              {copy.escapeLink}
            </button>
          </div>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Submission detail card */}
        <SubmissionDetailCard
          floor={submission.floor}
          {...(submission.ceiling !== undefined
            ? { ceiling: submission.ceiling }
            : {})}
          tier={submission.tier}
          vendor={submission.vendor}
          kind={submission.kind}
          submitter={submission.submitter}
          submittedAt={submission.submittedAt}
          note={submission.note}
          accentColor={accentColor}
        />

        {isSelfLocked ? (
          /* Self-locked waiting notice */
          <div
            style={{
              background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
              border: '1px dashed var(--border-strong)',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <LockGlyph size={14} />
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                color: 'var(--fg-muted)',
                lineHeight: 1.5,
              }}
            >
              {copy.selfLocked.waitingNotice}
            </span>
          </div>
        ) : (
          <>
            {/* Verify options (fresh state) */}
            <div
              role="radiogroup"
              aria-label="Verification method"
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              {verifyOptions.map((opt) => (
                <VerifyOption
                  key={opt.method}
                  method={opt.method}
                  label={opt.label}
                  description={opt.description}
                  isSelected={selectedMethod === opt.method}
                  accentColor={accentColor}
                  onSelect={setSelectedMethod}
                />
              ))}
            </div>

            {/* Honesty disclaimer */}
            <div
              style={{
                padding: '10px 12px',
                background: 'color-mix(in oklab, var(--fg) 3%, transparent)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                fontFamily: 'Inter, system-ui',
                fontSize: 12,
                color: 'var(--fg-subtle)',
                letterSpacing: '-0.005em',
                lineHeight: 1.45,
              }}
            >
              {copy.honestyDisclaimer}
            </div>
          </>
        )}
      </div>
    </ModalShell>
  )
}
