'use client'

import { useState, useCallback } from 'react'
import { CounterSubmitSheet } from './CounterSubmitSheet'
import {
  ArrowGlyph,
  Eyebrow,
  PendingTrustPill,
} from '@/components/consumer/glyphs'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.disputedPriceCard

// ── Helper ────────────────────────────────────────────────────────

const formatTimeAgo = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

// ── Props ─────────────────────────────────────────────────────────

export interface DisputedPriceCardProps {
  // Live price (current corroborated price)
  floor: number
  ceiling?: number
  tier: string
  vendor: string
  kind: 'community' | 'boxoffice'
  submitter: { handle: string } | null
  liveSubmittedAt: string
  confirmsCount: number

  // The pending counter-submission
  disputer: { handle: string } | null
  disputeFloor: number
  disputeCeiling?: number
  disputedAt: string // ISO date

  // The counter-submission ID — used as the deep-link anchor target for the
  // coral CounterPointerLink rendered inside PendingCardB.
  counterSubmissionId?: string | null

  // Engagement-signal pill. When 'defer', a quiet warning chip near the
  // dashed update strip surfaces CONSUMER_COPY.priceRegion.adminDeferPillLabel
  // ("Admin requested more info"). Sourced from
  // EventDetailResponse.counterSubmission.lastAdminActionKind.
  lastAdminActionKind?: 'defer' | null

  // For CounterSubmitSheet
  eventId: string
  disputedSubmissionId: string

  /**
   * Announces the sign-up gate to assistive tech without drawing it (#1247).
   * The button is unchanged visually and still opens CounterSubmitSheet, which
   * swaps itself for the tier picker when there is no session.
   */
  signedOut?: boolean

  onUpdateSuccess?: () => void
}

// ── Component ─────────────────────────────────────────────────────

export const DisputedPriceCard = ({
  floor,
  ceiling,
  tier,
  vendor,
  kind,
  submitter,
  liveSubmittedAt,
  confirmsCount,
  disputer,
  disputeFloor,
  disputeCeiling,
  disputedAt,
  counterSubmissionId = null,
  lastAdminActionKind = null,
  eventId,
  disputedSubmissionId,
  signedOut = false,
  onUpdateSuccess,
}: DisputedPriceCardProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const handleOpenSheet = useCallback(() => {
    setIsSheetOpen(true)
  }, [])

  const handleCloseSheet = useCallback(() => {
    setIsSheetOpen(false)
  }, [])

  const handleSuccess = useCallback(() => {
    setIsSheetOpen(false)
    onUpdateSuccess?.()
  }, [onUpdateSuccess])

  const timeAgo = formatTimeAgo(disputedAt)

  // Build the attribution text
  const attributionText = disputer
    ? disputeCeiling != null
      ? `@${disputer.handle} ${copy.strip.sawVerb} $${disputeFloor}–$${disputeCeiling} · ${timeAgo}`
      : `@${disputer.handle} ${copy.strip.sawVerb} $${disputeFloor} · ${timeAgo}`
    : disputeCeiling != null
      ? `${copy.strip.anonymousLabel} ${copy.strip.sawVerb} $${disputeFloor}–$${disputeCeiling} · ${timeAgo}`
      : `${copy.strip.anonymousLabel} ${copy.strip.sawVerb} $${disputeFloor} · ${timeAgo}`

  // Build the live price headline
  const headlineStr =
    ceiling != null
      ? `$${Math.round(floor)}–$${Math.round(ceiling)}`
      : `$${Math.round(floor)}`

  // Anchor target for the coral CounterPointerLink rendered inside
  // PendingCardB. Falls back to the disputed parent ID if the counter ID
  // wasn't passed — keeps the anchor non-broken for legacy callers.
  const anchorId = `counter-${counterSubmissionId ?? disputedSubmissionId}`

  return (
    <>
      {/* Card */}
      <div
        id={anchorId}
        style={{
          borderRadius: 12,
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        {/* Dashed update strip */}
        <div
          style={{
            padding: '9px 14px',
            background: 'color-mix(in oklab, var(--fg-muted) 8%, transparent)',
            borderBottom: '1px dashed var(--border-strong)',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          {/* Left side: badge + attribution */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              minWidth: 0,
            }}
          >
            {/* "update pending" badge */}
            <span
              style={{
                background:
                  'color-mix(in oklab, var(--fg-muted) 14%, transparent)',
                borderRadius: 4,
                padding: '2px 6px',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--fg)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                lineHeight: 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <svg
                width="9"
                height="9"
                viewBox="0 0 10 10"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M1 7.5 C2.5 7.5 2.5 4 4 4 C5.5 4 5.5 6 7 6 L9 2.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 2.5 L9 2.5 L9 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {copy.strip.badgeLabel}
            </span>

            {/* Attribution text: names the reader, so analytics skips it */}
            <span
              className="ph-no-capture"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                color: 'var(--fg-muted)',
                letterSpacing: '0.04em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {attributionText}
            </span>
          </div>

          {/* Admin-defer pill (LOCKED §9 — engagement signal) */}
          {lastAdminActionKind === 'defer' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 999,
                background:
                  'color-mix(in oklab, var(--warning) 10%, transparent)',
                color: 'var(--warning)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontWeight: 700,
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {CONSUMER_COPY.priceRegion.adminDeferPillLabel}
            </span>
          )}
        </div>

        {/* Main price area */}
        <div style={{ padding: '14px 14px 12px' }}>
          {/* Eyebrow */}
          <Eyebrow>{copy.body.ticketsLabel}</Eyebrow>

          {/* Headline row: price + tier + chip */}
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontWeight: 800,
                fontSize: 28,
                color: 'var(--fg)',
                letterSpacing: '-0.025em',
                lineHeight: 1.05,
              }}
            >
              {headlineStr}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: 11,
                color: 'var(--fg-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {tier}
            </span>
            <PendingTrustPill kind={kind} />
          </div>

          {/* Vendor line */}
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--fg-muted)',
              letterSpacing: '0.04em',
              marginTop: 6,
            }}
          >
            {copy.body.seenOnPrefix} {vendor}
          </div>

          {/* Attribution line */}
          <div
            style={{
              marginTop: 8,
              fontFamily: 'Inter, system-ui',
              fontSize: 12,
              color: 'var(--fg-muted)',
              letterSpacing: '-0.005em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <span>{copy.body.submittedByPrefix}</span>
            {submitter !== null ? (
              <span className="ph-no-capture" style={{ fontWeight: 700 }}>
                @{submitter.handle}
              </span>
            ) : (
              <span style={{ fontStyle: 'italic', opacity: 0.85 }}>
                {copy.strip.anonymousLabel}
              </span>
            )}
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{formatTimeAgo(liveSubmittedAt)}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{copy.body.fansConfirmed(confirmsCount)}</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 14px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          {/* Copy before button */}
          <span
            style={{
              fontFamily: 'Inter, system-ui',
              fontSize: '12px',
              color: 'var(--fg-subtle)',
              letterSpacing: '0.04em',
              flexShrink: 1,
              minWidth: 0,
            }}
          >
            {copy.footer.preButtonCopy}
          </span>

          {/* Submit an update button */}
          <button
            type="button"
            onClick={handleOpenSheet}
            {...(signedOut
              ? { 'aria-label': copy.footer.ariaButtonLabelSignedOut }
              : {})}
            style={{
              all: 'unset',
              cursor: 'pointer',
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: '7px 12px',
              fontFamily: 'var(--font-ui)',
              fontWeight: 700,
              fontSize: 12.5,
              color: 'var(--fg)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {copy.footer.buttonLabel}
            <ArrowGlyph size={11} />
          </button>
        </div>
      </div>

      {/* CounterSubmitSheet */}
      <CounterSubmitSheet
        open={isSheetOpen}
        onClose={handleCloseSheet}
        eventId={eventId}
        disputedSubmissionId={disputedSubmissionId}
        currentFloor={floor}
        {...(ceiling != null ? { currentCeiling: ceiling } : {})}
        currentVendor={vendor}
        onSuccess={handleSuccess}
      />
    </>
  )
}
