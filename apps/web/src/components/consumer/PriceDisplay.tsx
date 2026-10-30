'use client'

import { useState } from 'react'
import type { PriceSource, SourceCategory } from '@concert-crawl/types'
import { SubmitPriceModal } from '@/components/consumer/submit-price'
import { CCTip } from '@/components/ui/cc-tip'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { VENUE_BOX_OFFICE_LABEL } from '@/components/consumer/vendor-display'
import {
  resolveAlternateKind,
  resolveSourceKind,
} from '@/components/consumer/lib/price-source-kind'
import { relTimeAgo } from '@/components/consumer/lib/staleness'
import { StaleStamp } from '@/components/consumer/StaleStamp'
import { StillAccurateAction } from '@/components/consumer/StillAccurateAction'

const copy = CONSUMER_COPY

// ── Price shape used by PriceBlockB ─────────────────────────────
// Maps from the flat EventDetailResponse fields into a richer object
// that mirrors the design's price data shape. Fields not yet in the DB
// are optional and default to null — no migration needed this round.
export interface PriceBlockPrice {
  face: number
  max?: number | null
  fees?: number | null
  feeBreakdown?: Array<{ label: string; amount: number }> | null
  tier?: 'exact' | 'from'
  source?: string | null
  sourceUrl?: string | null
  sourceKind: 'primary' | 'resale' | 'community' | 'boxoffice'
  observedAt?: string | null
  openedAt?: number | null
  range14d?: number[] | null
  status?: 'live' | 'soldout'
  submitter?: { handle: string; url: string } | null
  verification?: {
    at: string
    by: {
      kind: 'user' | 'auto' | 'admin'
      handle?: string
      url?: string
      label?: string
    }
  } | null
  alternates?: Array<{
    source: string
    sourceUrl?: string | null
    sourceKind: 'primary' | 'resale' | 'community' | 'boxoffice'
    face: number
    fees?: number | null
  }>
  soldOutBy?: { handle: string; url: string } | null
  soldOutConfirms?: number | null
  // Fan confirms count — shown for community/boxoffice prices confirmed by the community
  confirmsCount?: number | null
  // Box-office meta
  boxOfficeAction?: 'bought' | 'saw'
  boxOfficeMethod?: 'in-person' | 'phone'
  boxOfficeFaceLiteral?: boolean
  venueName?: string | null
}

interface PriceDisplayProps {
  priceMin: string | null
  priceMax: string | null
  priceSource: PriceSource | null
  venueName: string
  ticketUrl: string | null
  eventId: string
  artist: string
  date: string
  // Extended fields (optional — undefined = not yet in API response)
  observedAt?: string | null
  range14d?: number[] | null
  priceStatus?: 'live' | 'soldout' | null
  ticketPriceOpenedAt?: number | null
  ticketFees?: number | null
  priceVendor?: string | null
  // The submitter's "Where's the price from?" answer. Drives the trust mark;
  // null only for rows predating #641, which fall back to vendor inference.
  priceSourceCategory?: SourceCategory | null
  priceSubmitterHandle?: string | null
  priceObservedAt?: string | null
  // The submission behind the displayed price, when there is one. A crawler
  // price has no row to stamp, so its absence is what excludes the action.
  priceSubmissionId?: string | null
  // Only the locally-promoted submission needs this: its timestamp lives in
  // client state, which `router.refresh()` cannot reach.
  onSighted?: () => void
  priceApprovalKind?: 'admin' | 'fan' | null
  priceApprovedAt?: string | null
  priceAlternates?: Array<{
    vendor: string | null
    priceMin: string
    priceMax: string | null
    sourceCategory?: SourceCategory | null
  }> | null
  // Fan confirms count — passed from optimistic section 4a to show "N fans confirmed"
  priceConfirmsCount?: number | null
  // When provided, the "Submit a price" button in the no-price state calls this
  // instead of opening an internal modal (lets parent own the submission flow)
  onSubmitPrice?: () => void
}

// ── Color constants ───────────────────────────────────────────────
const RESALE = 'var(--trust-resale)'
const GOLD = 'oklch(0.66 0.14 78)'
// Community color token — consumed from CSS variable so it responds to theme.
const COMMUNITY = 'var(--trust-community)'

// ── Helpers ──────────────────────────────────────────────────────

function resolveSourceName(
  source: PriceSource | null,
  venueName: string,
  vendor?: string | null,
): string | null {
  if (!source) return venueName
  switch (source) {
    case 'structured_data':
      return venueName
    case 'ticketmaster':
      return 'Ticketmaster'
    case 'eventbrite':
      return 'Eventbrite'
    case 'dice':
      return 'Dice.fm'
    case 'songkick':
      return 'Songkick'
    case 'bandsintown':
      return 'Bandsintown'
    case 'seatgeek':
      return 'SeatGeek'
    case 'community':
      return vendor === 'SeatGeek' ? 'SeatGeek' : null
  }
}

function formatUSD(val: number, opts?: { whole?: boolean }): string {
  if (opts?.whole || Number.isInteger(val)) return `$${Math.round(val)}`
  return `$${val.toFixed(2)}`
}

// ── SVG icons ────────────────────────────────────────────────────

function ExternalIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" aria-hidden>
      <path
        d="M3.5 2H2v6h6V6.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 2H8v2.5M8 2L4.5 5.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CaretIcon({ dir = 'down' }: { dir?: 'down' | 'up' }) {
  const rot = dir === 'up' ? 180 : 0
  return (
    <svg
      width={9}
      height={9}
      viewBox="0 0 10 10"
      style={{ transform: `rotate(${rot}deg)`, transition: 'transform .15s' }}
      aria-hidden
    >
      <path
        d="M2 4l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

function CheckIcon({
  size = 10,
  color = 'currentColor',
}: {
  size?: number
  color?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      style={{ flexShrink: 0 }}
      aria-hidden
    >
      <path
        d="M1.8 5.2L4 7.4 8.4 2.6"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── TrustMark — four tiers ────────────────────────────────────────
// boxoffice (gold ★) · community (azure C) · resale (coral R) · primary (vendor muted)
export function TrustMark({
  kind,
  glyph = true,
}: {
  kind: 'primary' | 'resale' | 'community' | 'boxoffice'
  glyph?: boolean
}) {
  const label =
    kind === 'resale'
      ? copy.priceDisplay.resaleLabel
      : kind === 'community'
        ? copy.priceDisplay.communityLabel
        : kind === 'boxoffice'
          ? copy.priceDisplay.boxOfficeTrustLabel
          : copy.priceDisplay.vendorLabel

  const tint =
    kind === 'resale'
      ? RESALE
      : kind === 'community'
        ? COMMUNITY
        : kind === 'boxoffice'
          ? GOLD
          : 'var(--fg-muted)'

  const bg =
    kind === 'resale'
      ? `color-mix(in oklab, ${RESALE} 16%, transparent)`
      : kind === 'community'
        ? `color-mix(in oklab, ${COMMUNITY} 16%, transparent)`
        : kind === 'boxoffice'
          ? `color-mix(in oklab, ${GOLD} 22%, transparent)`
          : 'color-mix(in oklab, var(--fg-muted) 12%, transparent)'

  const border =
    kind === 'boxoffice'
      ? `1px solid color-mix(in oklab, ${GOLD} 60%, transparent)`
      : 'none'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 6px',
        borderRadius: 4,
        background: bg,
        color: tint,
        border,
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        verticalAlign: 'middle',
      }}
    >
      {kind === 'boxoffice' && glyph && (
        <svg
          width="8"
          height="8"
          viewBox="0 0 10 10"
          style={{ flexShrink: 0 }}
          aria-hidden
        >
          <path
            d="M5 1l1.18 2.46L9 3.78l-2 1.92.55 2.8L5 7.2 2.45 8.5 3 5.7 1 3.78l2.82-.32L5 1z"
            fill={tint}
          />
        </svg>
      )}
      {label}
    </span>
  )
}

// ── Sparkline ────────────────────────────────────────────────────
// Renders only when ≥4 datapoints AND sourceKind is not community or boxoffice.
// flag: colors the line — 'drop' = success green, 'rise' = warning, null = fg-subtle
// dim: mutes opacity for sold-out state
function Sparkline({
  values,
  width = 84,
  height = 22,
  flag = null,
  dim = false,
}: {
  values: number[]
  width?: number
  height?: number
  flag?: 'drop' | 'rise' | null
  dim?: boolean
}) {
  if (values.length < 4) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 1)
  const stepX = width / (values.length - 1)
  const points = values.map((val, idx) => {
    const xCoord = idx * stepX
    const yCoord = height - 2 - ((val - min) / range) * (height - 4)
    return [xCoord, yCoord] as [number, number]
  })
  const pathD = points
    .map(([xCoord, yCoord], idx) =>
      idx === 0 ? `M${xCoord},${yCoord}` : `L${xCoord},${yCoord}`,
    )
    .join(' ')
  const last = points[points.length - 1]
  if (!last) return null

  const stroke =
    flag === 'drop'
      ? 'var(--success)'
      : flag === 'rise'
        ? 'var(--warning)'
        : 'var(--fg-subtle)'

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', flexShrink: 0, opacity: dim ? 0.4 : 1 }}
      aria-hidden
    >
      <path
        d={pathD}
        stroke={stroke}
        strokeWidth="1.25"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2" fill={stroke} />
    </svg>
  )
}

// ── VerifiedStamp ───────────────────────────────────────────────
function VerifiedStamp({
  verification,
  subject,
}: {
  verification: NonNullable<PriceBlockPrice['verification']>
  subject?: string | null
}) {
  const stale =
    Date.now() - new Date(verification.at).getTime() > 7 * 24 * 60 * 60 * 1000
  const rel = relTimeAgo(verification.at)
  const color = stale ? 'var(--warning)' : 'var(--success)'
  const headWord = subject ? `${subject} verified` : 'Verified'
  const { by } = verification
  const whenText = stale
    ? `${rel}${copy.priceStaleness.couldBeStaleSuffix}`
    : rel

  let head: React.ReactNode
  if (by.kind === 'user' && by.handle) {
    head = (
      <>
        {headWord} {copy.priceDisplay.attribution}{' '}
        <a
          href={by.url}
          className="ph-no-capture"
          style={{
            color: 'inherit',
            textDecoration: 'underline',
            textDecorationColor: 'var(--border-strong)',
            textUnderlineOffset: 2,
          }}
        >
          {by.handle}
        </a>
      </>
    )
  } else if (by.label) {
    head = (
      <>
        {headWord} {copy.priceDisplay.attribution} {by.label}
      </>
    )
  } else {
    head = <>{headWord}</>
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color,
        letterSpacing: '0.04em',
      }}
    >
      <CheckIcon color={color} size={10} />
      <span>
        {head} · {whenText}
      </span>
    </span>
  )
}

// ── FeeBreakdown — collapsible ───────────────────────────────────
function FeeBreakdown({ price }: { price: PriceBlockPrice }) {
  const [open, setOpen] = useState(false)
  if (!price.feeBreakdown || price.fees == null || price.fees <= 0) return null
  const allIn = price.face + price.fees

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--fg-muted)',
          letterSpacing: '0.02em',
        }}
      >
        <span>{copy.priceDisplay.feesToggle(formatUSD(price.fees))}</span>
        <CaretIcon dir={open ? 'up' : 'down'} />
      </button>
      {open && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 10px',
            borderRadius: 8,
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {price.feeBreakdown.map((row, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--fg-muted)',
              }}
            >
              <span>{row.label}</span>
              <span style={{ color: 'var(--fg)' }}>
                {formatUSD(row.amount)}
              </span>
            </div>
          ))}
          <div
            style={{ height: 1, background: 'var(--border)', margin: '2px 0' }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--fg-muted)',
            }}
          >
            <span style={{ color: 'var(--fg-subtle)' }}>
              {copy.priceDisplay.faceValueRow}
            </span>
            <span style={{ color: 'var(--fg)' }}>
              {formatUSD(price.face, { whole: true })}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 2,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--fg)',
              fontWeight: 700,
            }}
          >
            <span>{copy.priceDisplay.allInIncludingFees}</span>
            <span>{formatUSD(allIn)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── AlternateSourceRow ───────────────────────────────────────────
function AlternateSourceRow({
  alt,
}: {
  alt: NonNullable<PriceBlockPrice['alternates']>[number]
}) {
  if (alt.face == null) return null
  const allInVal = alt.face + (alt.fees ?? 0)
  const showAllIn = (alt.fees ?? 0) > 0
  const dotColor =
    alt.sourceKind === 'resale'
      ? RESALE
      : alt.sourceKind === 'community'
        ? COMMUNITY
        : alt.sourceKind === 'boxoffice'
          ? GOLD
          : 'var(--fg-muted)'
  const kindLabel =
    alt.sourceKind === 'resale'
      ? copy.priceDisplay.resaleLabel
      : alt.sourceKind === 'community'
        ? copy.priceDisplay.communityLabel
        : alt.sourceKind === 'boxoffice'
          ? copy.priceDisplay.boxOfficeTrustLabel
          : copy.priceDisplay.vendorLabel

  const inner = (
    <>
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 2.5,
          flexShrink: 0,
          background: dotColor,
          alignSelf: 'center',
          opacity: 0.85,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-ui)',
          fontWeight: 500,
          fontSize: 12,
          color: 'var(--fg-muted)',
          letterSpacing: '-0.005em',
        }}
      >
        {alt.source}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8.5,
          color: dotColor,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          opacity: 0.75,
        }}
      >
        {kindLabel}
      </span>
      <span style={{ flex: 1 }} />
      <span
        style={{
          fontFamily: 'var(--font-ui)',
          fontWeight: 600,
          fontSize: 12.5,
          color: 'var(--fg-muted)',
          letterSpacing: '-0.01em',
        }}
      >
        {showAllIn
          ? formatUSD(allInVal, { whole: allInVal >= 10 })
          : `$${alt.face}`}
      </span>
      {showAllIn && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.04em',
          }}
        >
          {copy.priceDisplay.allInSuffix}
        </span>
      )}
      {alt.sourceUrl && <ExternalIcon size={8} />}
    </>
  )

  return alt.sourceUrl ? (
    <a
      href={alt.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        padding: '8px 0',
        borderTop: '1px dashed var(--border)',
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      {inner}
    </a>
  ) : (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        padding: '8px 0',
        borderTop: '1px dashed var(--border)',
      }}
    >
      {inner}
    </div>
  )
}

// ── DropDotIcon ─────────────────────────────────────────────────
function DropDotIcon({ size = 8 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" aria-hidden>
      <circle cx="4" cy="4" r="3" fill="var(--success)" />
    </svg>
  )
}

// ── DeltaPill — price-vs-on-sale indicator ───────────────────────
// Renders when openedAt differs from current face price.
// Down (price dropped): success-colored. Up (price rose): muted/neutral.
function DeltaPill({
  face,
  openedAt,
}: {
  face: number
  openedAt: number | null | undefined
}) {
  if (openedAt == null || openedAt === face) return null
  const diff = face - openedAt
  const isDown = diff < 0
  const absDiff = Math.abs(diff)
  const deltaStr = formatUSD(absDiff, { whole: absDiff >= 1 })
  const text = isDown
    ? `${deltaStr} ${copy.priceDisplay.cheaperThanOnSale}`
    : `+${deltaStr} ${copy.priceDisplay.sinceOnSale}`

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.02em',
        color: isDown ? 'var(--success)' : 'var(--fg-muted)',
      }}
    >
      {isDown && <DropDotIcon />}
      {text}
    </span>
  )
}

// ── BoxOfficeAttribution — in-person or phone purchase line ──────
function BoxOfficeAttribution({ price }: { price: PriceBlockPrice }) {
  const {
    boxOfficeAction,
    boxOfficeMethod,
    venueName,
    submitter,
    confirmsCount,
  } = price
  // Render nothing unless we have at least the venue name
  if (!venueName) return null

  // Fan-corroborated box office price — no purchase/observation metadata recorded.
  // Show simple "Submitted by @handle · N fans confirmed" attribution instead.
  if (!boxOfficeAction) {
    const confirmsText =
      confirmsCount != null && confirmsCount > 0
        ? ` · ${confirmsCount} ${confirmsCount !== 1 ? copy.priceDisplay.fansConfirmedSuffix : copy.priceDisplay.fanConfirmedSuffix}`
        : ''
    return (
      <div style={{ marginTop: 6 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--fg-muted)',
            letterSpacing: '0.03em',
          }}
        >
          {copy.priceDisplay.submittedByPrefix}{' '}
          {submitter ? (
            submitter.url ? (
              <a
                href={submitter.url}
                className="ph-no-capture"
                style={{
                  color: 'inherit',
                  textDecoration: 'underline',
                  textDecorationColor: 'var(--border-strong)',
                  textUnderlineOffset: 2,
                }}
              >
                @{submitter.handle}
              </a>
            ) : (
              <span className="ph-no-capture">@{submitter.handle}</span>
            )
          ) : (
            <em>{copy.priceDisplay.anonymousFan}</em>
          )}
          {confirmsText}
        </span>
      </div>
    )
  }

  const actionWord =
    boxOfficeAction === 'saw'
      ? copy.priceDisplay.sawVerb
      : copy.priceDisplay.boughtVerb
  // Phone purchases use "from" (called remotely); in-person uses "at" (was there)
  const prep = boxOfficeMethod === 'phone' ? 'from' : 'at'
  const methodSuffix =
    boxOfficeMethod === 'phone' ? ` ${copy.priceDisplay.byPhoneSuffix}` : ''
  const byLine = submitter ? (
    <>
      {' by '}
      {submitter.url ? (
        <a
          href={submitter.url}
          className="ph-no-capture"
          style={{
            color: 'inherit',
            textDecoration: 'underline',
            textDecorationColor: 'var(--border-strong)',
            textUnderlineOffset: 2,
          }}
        >
          @{submitter.handle}
        </a>
      ) : (
        <span className="ph-no-capture">@{submitter.handle}</span>
      )}
    </>
  ) : (
    <>
      {' '}
      {copy.priceDisplay.attribution} <em>{copy.priceDisplay.anonymousFan}</em>
    </>
  )

  return (
    <div style={{ marginTop: 6 }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--fg-muted)',
          letterSpacing: '0.03em',
        }}
      >
        {/* Verb ("Bought"/"Saw") is gold-weighted — it's the trust signal */}
        <span style={{ color: GOLD, fontWeight: 700 }}>{actionWord}</span>
        {copy.priceDisplay.boxOfficeSource(prep, venueName)}
        {byLine}
        {methodSuffix}
      </span>
    </div>
  )
}

// ── SoldOutReporterAttribution — who flagged this as sold out ────
function SoldOutReporterAttribution({ price }: { price: PriceBlockPrice }) {
  const { soldOutBy, soldOutConfirms } = price
  if (soldOutBy == null && (soldOutConfirms == null || soldOutConfirms <= 0))
    return null
  const confirmsText =
    soldOutConfirms != null && soldOutConfirms > 0
      ? ` · ${soldOutConfirms} ${soldOutConfirms !== 1 ? copy.priceDisplay.fansConfirmedSuffix : copy.priceDisplay.fanConfirmedSuffix}`
      : ''

  const reportedBy = soldOutBy ? (
    <>
      {`${copy.priceDisplay.reportedSoldOutBy} `}
      {soldOutBy.url ? (
        <a
          href={soldOutBy.url}
          className="ph-no-capture"
          style={{
            color: 'inherit',
            textDecoration: 'underline',
            textDecorationColor: 'var(--border-strong)',
            textUnderlineOffset: 2,
          }}
        >
          @{soldOutBy.handle}
        </a>
      ) : (
        <span className="ph-no-capture">@{soldOutBy.handle}</span>
      )}
    </>
  ) : (
    copy.priceDisplay.reportedSoldOut
  )

  return (
    <div style={{ marginTop: 6 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.03em',
        }}
      >
        {reportedBy}
        {confirmsText}
      </span>
    </div>
  )
}

// ── CommunityHandoffCard — shown when price is null ──────────────
function CommunityHandoffCard({
  eventId,
  artist,
  venueName: venueNameProp,
  date,
  onSubmitPrice,
}: {
  eventId: string
  artist: string
  venueName: string
  date: string
  onSubmitPrice?: () => void
}) {
  const [isSubmitOpen, setIsSubmitOpen] = useState(false)
  return (
    <div
      style={{
        marginTop: 18,
        padding: '16px 14px 14px',
        borderRadius: 12,
        background: `color-mix(in oklab, ${COMMUNITY} 6%, var(--surface-1))`,
        border: `1px solid color-mix(in oklab, ${COMMUNITY} 32%, var(--border))`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Community badge — pinned top-right */}
      <span
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          padding: '3px 8px',
          borderRadius: '0 0 0 6px',
          background: `color-mix(in oklab, ${COMMUNITY} 20%, transparent)`,
          color: COMMUNITY,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {copy.priceDisplay.communityBadge}
      </span>

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {copy.priceDisplay.ticketsLabel}
      </div>

      <div
        style={{
          marginTop: 6,
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 900,
            fontSize: 24,
            color: 'var(--fg)',
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
          }}
        >
          {copy.priceDisplay.noPriceYet}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 700,
            fontSize: 14,
            color: COMMUNITY,
            letterSpacing: '-0.005em',
          }}
        >
          {copy.priceDisplay.yourCall}
        </span>
      </div>

      <p
        style={{
          margin: '8px 0 0',
          fontFamily: 'var(--font-ui)',
          fontSize: 13.5,
          color: 'var(--fg-muted)',
          lineHeight: 1.5,
          letterSpacing: '-0.005em',
        }}
      >
        {copy.priceDisplay.communityGapBody}
      </p>

      <button
        type="button"
        onClick={() =>
          onSubmitPrice ? onSubmitPrice() : setIsSubmitOpen(true)
        }
        style={{
          all: 'unset',
          marginTop: 14,
          boxSizing: 'border-box',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          height: 44,
          width: '100%',
          borderRadius: 9,
          background: 'var(--signal)',
          color: 'var(--fg-on-accent)',
          fontFamily: 'var(--font-ui)',
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: '-0.005em',
        }}
      >
        {copy.priceDisplay.submitPriceButton}
        <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M2.5 6h7M6 2.5l3.5 3.5L6 9.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {!onSubmitPrice && (
        <SubmitPriceModal
          open={isSubmitOpen}
          onClose={() => setIsSubmitOpen(false)}
          eventId={eventId}
          artist={artist}
          venueName={venueNameProp}
          date={date}
        />
      )}

      <div
        style={{
          marginTop: 10,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {copy.priceDisplay.anonymousWorksHint}
      </div>
    </div>
  )
}

// ── PriceBlockB — spacious dedicated card ────────────────────────
// When price is null → community-handoff card.
// When price exists → full card with headline, breakdown, trust marks, etc.
// ── Alternate vendor helpers ──────────────────────────────────────
function resolveAlternateName(vendor: string | null): string | null {
  switch (vendor) {
    case 'VenueBoxOffice':
      return VENUE_BOX_OFFICE_LABEL
    case 'SeatGeek':
      return 'SeatGeek'
    case 'AXS':
      return 'AXS'
    case 'Ticketmaster':
      return 'Ticketmaster'
    case 'DICE':
      return 'Dice.fm'
    case 'Eventbrite':
      return 'Eventbrite'
    default:
      return null
  }
}

export function PriceDisplay({
  priceMin,
  priceMax,
  priceSource,
  venueName,
  ticketUrl,
  eventId,
  artist,
  date,
  observedAt,
  range14d,
  priceStatus,
  ticketPriceOpenedAt,
  ticketFees,
  priceVendor,
  priceSourceCategory,
  priceSubmitterHandle,
  priceObservedAt,
  priceSubmissionId,
  onSighted,
  priceApprovalKind,
  priceApprovedAt,
  priceAlternates,
  priceConfirmsCount,
  onSubmitPrice,
}: PriceDisplayProps) {
  const parsedMin = priceMin ? parseFloat(priceMin) : null
  const parsedMax = priceMax ? parseFloat(priceMax) : null
  const face = parsedMin !== null && !isNaN(parsedMin) ? parsedMin : null
  const faceMax = parsedMax !== null && !isNaN(parsedMax) ? parsedMax : null
  const sourceKind = resolveSourceKind(
    priceSource,
    priceVendor,
    priceSourceCategory,
  )
  const sourceName = resolveSourceName(priceSource, venueName, priceVendor)
  const effectiveObservedAt = observedAt ?? priceObservedAt ?? null
  const sourceUrl = ticketUrl

  // No-price state → community-handoff card
  if (face === null) {
    return (
      <CommunityHandoffCard
        eventId={eventId}
        artist={artist}
        venueName={venueName}
        date={date}
        {...(onSubmitPrice ? { onSubmitPrice } : {})}
      />
    )
  }

  // Build a PriceBlockPrice-shaped object from the flat API fields.
  // Fields not yet returned by the API are null — they short-circuit
  // gracefully in every sub-component.
  const priceObj: PriceBlockPrice = {
    face,
    max: faceMax,
    fees: ticketFees ?? null,
    sourceKind,
    source: sourceName,
    sourceUrl: ticketUrl,
    observedAt: effectiveObservedAt,
    openedAt: ticketPriceOpenedAt ?? null,
    range14d: range14d ?? null,
    status: priceStatus ?? 'live',
    submitter: priceSubmitterHandle
      ? { handle: priceSubmitterHandle, url: '' }
      : null,
    verification:
      priceApprovalKind === 'admin' && priceApprovedAt
        ? {
            at: priceApprovedAt,
            by: { kind: 'admin' as const, label: 'the team' },
          }
        : null,
    alternates: (priceAlternates ?? []).map((alt) => ({
      source: resolveAlternateName(alt.vendor) ?? alt.vendor ?? 'Community',
      sourceKind: resolveAlternateKind(alt.vendor, alt.sourceCategory),
      face: parseFloat(alt.priceMin),
      fees: null,
      sourceUrl: null,
    })),
    // Box-office / community fields — null until API wires them
    venueName: venueName,
    soldOutBy: null,
    soldOutConfirms: null,
    confirmsCount: priceConfirmsCount ?? null,
  }

  const soldOut = priceStatus === 'soldout'
  const isBoxOffice = sourceKind === 'boxoffice'
  const isCommunity = sourceKind === 'community'

  // Sparkline for primary and resale tiers with ≥4 datapoints.
  // Community and box-office are excluded per spec (single data point / no history).
  const hasSpark =
    !soldOut &&
    Array.isArray(range14d) &&
    range14d.length >= 4 &&
    sourceKind !== 'community' &&
    sourceKind !== 'boxoffice'

  // Sparkline flag: compare first vs last value in the 14-day range.
  // 'drop' = price went down (success green), 'rise' = price went up (warning), null = flat.
  const sparkFlag: 'drop' | 'rise' | null =
    hasSpark && Array.isArray(range14d) && range14d.length >= 2
      ? range14d[range14d.length - 1]! < range14d[0]!
        ? 'drop'
        : range14d[range14d.length - 1]! > range14d[0]!
          ? 'rise'
          : null
      : null

  // Card theming
  const cardBg = isBoxOffice
    ? `color-mix(in oklab, ${GOLD} 8%, var(--surface-1))`
    : 'var(--surface-1)'
  const cardBorder = isBoxOffice
    ? `1px solid color-mix(in oklab, ${GOLD} 52%, var(--border))`
    : '1px solid var(--border)'
  const cardBoxShadow = isBoxOffice
    ? `inset 0 1px 0 color-mix(in oklab, oklch(0.66 0.14 78) 40%, transparent)`
    : undefined

  // Headline price — show all-in (face + fees) for non-boxoffice tiers when fees exist.
  // Box-office always shows face (no fees by definition). Ranges use face min/max only.
  const allInFace =
    !isBoxOffice && priceObj.fees && priceObj.fees > 0
      ? face + priceObj.fees
      : face
  const headlineStr =
    faceMax && faceMax > face
      ? `$${Math.round(face)}–$${Math.round(faceMax)}`
      : formatUSD(allInFace, { whole: allInFace >= 10 })

  return (
    <div
      style={{
        marginTop: 18,
        padding: '14px 14px 12px',
        borderRadius: 12,
        background: cardBg,
        border: cardBorder,
        boxShadow: cardBoxShadow,
        position: 'relative',
      }}
    >
      {/* Top row — label + sparkline */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: isBoxOffice ? GOLD : 'var(--fg-subtle)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {isBoxOffice
              ? copy.priceDisplay.boxOfficeLabel
              : copy.priceDisplay.ticketsLabel}
          </div>
          {/* The label says where the number came from; this answers the
              question that raises, which is who put it there. It sits with
              the label rather than the sparkline so the disc reads as
              belonging to the words next to it. */}
          <CCTip tip="who-set-this-price" placement="bottom" align="start" />
        </div>
        {hasSpark && range14d && (
          <Sparkline values={range14d} flag={sparkFlag} dim={soldOut} />
        )}
      </div>

      {/* Headline number */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginTop: 6,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 900,
            fontSize: 28,
            color: soldOut ? 'var(--fg-subtle)' : 'var(--fg)',
            letterSpacing: '-0.025em',
            textDecoration: soldOut ? 'line-through' : 'none',
            textDecorationColor: 'var(--fg-subtle)',
          }}
        >
          {headlineStr}
        </span>

        {!soldOut && (
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 600,
              fontSize: 12,
              color: isBoxOffice ? GOLD : 'var(--fg-muted)',
              letterSpacing: '-0.005em',
            }}
          >
            {isBoxOffice
              ? copy.priceDisplay.faceValueNoFees
              : faceMax
                ? copy.priceDisplay.startingAllIn
                : priceObj.fees && priceObj.fees > 0
                  ? copy.priceDisplay.allIn
                  : copy.priceDisplay.faceValue}
          </span>
        )}

        {/* Trust mark — all four tiers */}
        {!soldOut && <TrustMark kind={sourceKind} />}

        {/* Sold out pill */}
        {soldOut && (
          <span
            style={{
              padding: '2px 7px',
              borderRadius: 4,
              background: 'var(--warning)',
              color: 'var(--fg-on-accent)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {copy.priceDisplay.soldOutPill}
          </span>
        )}
      </div>

      {/* Source attribution — community shows submitter handle or "anonymous fan" */}
      {!soldOut && isCommunity && (
        <div style={{ marginTop: 6 }}>
          {/* Community box-office context — shown when fan saw (not bought) the price
              at the venue in person or by phone. Renders above the @handle line. */}
          {priceObj.boxOfficeAction === 'saw' &&
            priceObj.venueName &&
            priceObj.boxOfficeMethod && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  marginBottom: 4,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--fg-muted)',
                  letterSpacing: '0.04em',
                }}
              >
                {/* Phone or location icon matches the source of the observation */}
                {priceObj.boxOfficeMethod === 'phone' ? (
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 10 10"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M2 2.5C2 2 2.4 1.5 3 1.5h1.2c.4 0 .8.3.9.7l.3 1.2c.1.4-.1.8-.4 1L4.5 4.8c.6 1.1 1.6 2.1 2.7 2.7l.4-.5c.2-.3.6-.5 1-.4l1.2.3c.4.1.7.5.7.9V9c0 .6-.5 1-1 1-3.9 0-7-3.1-7-7v-.5z"
                      stroke="currentColor"
                      strokeWidth="0.9"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 10 10"
                    fill="none"
                    aria-hidden
                  >
                    <circle
                      cx="5"
                      cy="5"
                      r="1.8"
                      stroke="currentColor"
                      strokeWidth="0.9"
                    />
                    <circle
                      cx="5"
                      cy="5"
                      r="3.5"
                      stroke="currentColor"
                      strokeWidth="0.9"
                      opacity="0.5"
                    />
                  </svg>
                )}
                {/* Verb is bold fg — it's the trust signal, same pattern as BoxOfficeAttribution */}
                <span style={{ color: 'var(--fg)', fontWeight: 700 }}>
                  {priceObj.boxOfficeMethod === 'phone'
                    ? copy.priceDisplay.calledVerb
                    : copy.priceDisplay.sawVerb}
                </span>
                {priceObj.boxOfficeMethod === 'phone'
                  ? `the ${priceObj.venueName} box office`
                  : `at ${priceObj.venueName} box office`}
                <span style={{ opacity: 0.5 }}>·</span>
                <span style={{ opacity: 0.85 }}>
                  {priceObj.boxOfficeMethod === 'phone'
                    ? copy.priceDisplay.byPhoneObservation
                    : copy.priceDisplay.inPersonObservation}
                </span>
              </div>
            )}
          {priceObj.submitter ? (
            <a
              href={priceObj.submitter.url}
              className="ph-no-capture"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--fg-subtle)',
                letterSpacing: '0.04em',
                textDecoration: 'underline',
                textDecorationColor: 'var(--border-strong)',
                textUnderlineOffset: 2,
              }}
            >
              @{priceObj.submitter.handle}
            </a>
          ) : (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--fg-subtle)',
                letterSpacing: '0.04em',
                fontStyle: 'italic',
              }}
            >
              {copy.priceDisplay.anonymousFan}
            </span>
          )}
        </div>
      )}

      {/* Box-office attribution line */}
      {!soldOut && isBoxOffice && <BoxOfficeAttribution price={priceObj} />}

      {/* Sold-out reporter attribution */}
      {soldOut && <SoldOutReporterAttribution price={priceObj} />}

      {/* Fee breakdown + delta pill in a single flex row — mirrors design layout */}
      {!soldOut && !isBoxOffice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 6,
            flexWrap: 'wrap',
          }}
        >
          <FeeBreakdown price={priceObj} />
          {priceObj.openedAt != null && priceObj.openedAt !== face && (
            <>
              <span style={{ color: 'var(--fg-subtle)', opacity: 0.4 }}>·</span>
              <DeltaPill face={allInFace} openedAt={priceObj.openedAt} />
            </>
          )}
        </div>
      )}

      {/* Alternate sources — "Or pay for convenience" */}
      {!soldOut && priceObj.alternates && priceObj.alternates.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 2,
            }}
          >
            {copy.priceDisplay.orPayForConvenience}
          </div>
          {priceObj.alternates.map((alt, idx) => (
            <AlternateSourceRow key={idx} alt={alt} />
          ))}
        </div>
      )}

      {/* Footer — stale stamp · submitter · source + verification line */}
      <div
        style={{
          marginTop: 10,
          paddingTop: 9,
          borderTop: '1px solid var(--border)',
        }}
      >
        {/* Row 1: stale stamp, submitter handle (community/boxoffice), source name (primary/resale) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <StaleStamp observedAt={effectiveObservedAt} />
          {/* Gated on the stamp the way MultiTierLiveCard gates it: with no
              observation there is nothing to call stale, and mounting the
              action regardless makes every surface rendering a price depend on
              the app router even where the affordance can never appear. */}
          {effectiveObservedAt && (
            <StillAccurateAction
              eventId={eventId}
              submissionId={priceSubmissionId}
              observedAt={effectiveObservedAt}
              {...(onSighted ? { onSighted } : {})}
            />
          )}
          {/* Submitter handle — community tier only (boxoffice uses BoxOfficeAttribution above) */}
          {isCommunity && priceObj.submitter && (
            <>
              {effectiveObservedAt && (
                <span style={{ color: 'var(--fg-subtle)', opacity: 0.4 }}>
                  ·
                </span>
              )}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--fg-subtle)',
                  letterSpacing: '0.04em',
                }}
                className="ph-no-capture"
              >
                @{priceObj.submitter.handle}
              </span>
            </>
          )}
          {/* Source name — primary and resale tiers */}
          {sourceName && !isCommunity && !isBoxOffice && (
            <>
              {effectiveObservedAt && (
                <span style={{ color: 'var(--fg-subtle)', opacity: 0.4 }}>
                  ·
                </span>
              )}
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--fg-subtle)',
                    textDecoration: 'none',
                    letterSpacing: '0.04em',
                  }}
                >
                  {sourceName}
                  <ExternalIcon />
                </a>
              ) : (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--fg-subtle)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {sourceName}
                </span>
              )}
            </>
          )}
          {/* Source name for resale community tier (e.g. SeatGeek) */}
          {sourceName && isCommunity && (
            <>
              <span style={{ color: 'var(--fg-subtle)', opacity: 0.4 }}>·</span>
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--fg-subtle)',
                    textDecoration: 'none',
                    letterSpacing: '0.04em',
                  }}
                >
                  {sourceName}
                  <ExternalIcon />
                </a>
              ) : (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--fg-subtle)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {sourceName}
                </span>
              )}
            </>
          )}
        </div>
        {/* Row 2: verification — "Verified by the team" (admin) or "Verified by @handle" (fan) */}
        {priceObj.verification && (
          <div style={{ marginTop: 5 }}>
            <VerifiedStamp
              verification={priceObj.verification}
              subject={
                isBoxOffice &&
                priceObj.alternates &&
                priceObj.alternates.length > 0
                  ? 'Box-office price'
                  : null
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}
