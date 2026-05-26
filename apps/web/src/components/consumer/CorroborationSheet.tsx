'use client'

import { useState } from 'react'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { LockGlyph } from './glyphs'

const copy = CONSUMER_COPY.corroborationSheet

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
    note?: string
    submissionId: string
  }
  open: boolean
  isSelfLocked?: boolean
  onClose: () => void
  onConfirm: (method: string) => void
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
  accentColor: string
}

const SubmissionDetailCard = ({
  floor,
  ceiling,
  tier,
  vendor,
  kind,
  submitter,
  accentColor,
}: SubmissionDetailCardProps) => {
  const tokens = pendingTokens(kind)

  const attributionNode = (() => {
    if (submitter === null) {
      return (
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9.5px',
            color: 'var(--fg-subtle)',
          }}
        >
          {copy.viaAnonymous}
        </span>
      )
    }

    return (
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '9.5px',
          color: 'var(--fg-subtle)',
        }}
      >
        {copy.viaHandlePrefix}
        <a
          href={submitter.url}
          style={{ color: 'var(--fg-subtle)', textDecoration: 'underline' }}
        >
          {submitter.handle}
        </a>
      </span>
    )
  })()

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
          gap: '4px',
        }}
      >
        {/* Price */}
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 800,
            fontSize: '30px',
            color: 'var(--fg)',
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          {ceiling !== undefined ? `$${floor}–${ceiling}` : `$${floor}`}
        </p>

        {/* Metadata grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '4px 12px',
            marginTop: '4px',
          }}
        >
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9.5px',
              color: 'var(--fg-subtle)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {tier}
          </span>
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9.5px',
              color: 'var(--fg-subtle)',
            }}
          >
            {vendor}
          </span>
          <div style={{ gridColumn: '1 / -1' }}>{attributionNode}</div>
        </div>

        {/* Box-office badge */}
        {kind === 'boxoffice' && (
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '12px',
              color: accentColor,
              margin: '2px 0 0',
            }}
          >
            face value · no fees
          </p>
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
  onSubmitUpdate,
}: CorroborationSheetProps) => {
  const [selectedMethod, setSelectedMethod] = useState<VerifyMethod | null>(
    null,
  )

  if (!open) return null

  const accentColor = submission.kind === 'boxoffice' ? GOLD : AZURE

  const verifyOptions: Array<{
    method: VerifyMethod
    label: string
    description: string
  }> = [
    {
      method: 'same_vendor',
      label: copy.options.sameVendor.label(submission.vendor),
      description: copy.options.sameVendor.description(submission.vendor),
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
    {
      method: 'bought_myself',
      label: copy.options.boughtMyself.label,
      description: copy.options.boughtMyself.description,
    },
  ]

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
          maxHeight: isSelfLocked ? '620px' : '820px',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            position: 'relative',
            height: '20px',
            flexShrink: 0,
          }}
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
            padding: '10px 16px 8px',
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
            {!isSelfLocked && (
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
            )}
          </div>

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
            accentColor={accentColor}
          />

          {isSelfLocked ? (
            /* Self-locked waiting notice */
            <div
              style={{
                background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
                border: '1px dashed var(--border-strong)',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              {/* Lock icon */}
              <LockGlyph size={10} />
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '9px',
                  color: 'var(--fg-muted)',
                  lineHeight: 1.5,
                }}
              >
                {copy.selfLocked.waitingNotice}
              </span>
            </div>
          ) : (
            /* Verify options (fresh state) */
            <div
              role="radiogroup"
              aria-label="Verification method"
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
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
          )}
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
          {isSelfLocked ? (
            /* Self-locked footer: Edit + Withdraw */
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <button
                onClick={onSubmitUpdate}
                style={{
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '10px',
                  height: '44px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                {copy.selfLocked.editButton}
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--warning)',
                  borderRadius: '10px',
                  height: '44px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 700,
                  fontSize: '13.5px',
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
            <>
              <button
                onClick={() => {
                  if (selectedMethod !== null) {
                    onConfirm(selectedMethod)
                  }
                }}
                disabled={selectedMethod === null}
                style={{
                  background: accentColor,
                  height: '48px',
                  borderRadius: '10px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 800,
                  fontSize: '14.5px',
                  color: 'var(--fg-on-accent)',
                  border: 'none',
                  cursor: selectedMethod !== null ? 'pointer' : 'not-allowed',
                  opacity: selectedMethod !== null ? 1 : 0.45,
                  width: '100%',
                  transition: 'opacity 0.12s',
                }}
              >
                {copy.confirmButton}
              </button>

              <button
                onClick={onSubmitUpdate}
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
                {copy.escapeLink}
              </button>

              <div
                style={{
                  background: 'color-mix(in oklab, var(--fg) 3%, transparent)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Inter, system-ui',
                    fontSize: '12px',
                    color: 'var(--fg-subtle)',
                    lineHeight: 1.5,
                  }}
                >
                  {copy.honestyDisclaimer}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
