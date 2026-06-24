import { type FC } from 'react'
import type { SourceCategory, Tier, Vendor } from '@concert-crawl/types'
import { REVIEW_CONTEST_COPY } from './definitions/copy'

// Shared per-side card rendered twice inside AdminDisputePanel (parent +
// counter, side-by-side). Pure presentational: takes props, renders DOM.
// No hooks, no data fetching, no router calls — easy to test, easy for
// AdminDisputePanel (Task 15) to compose.
//
// Visual contract pinned to design property table §3b
// (docs/superpowers/design-tables/admin-contest-review.md lines 193–232).
// Source citations in inline comments point back to the dispute-surfaces.jsx
// reference rows the table cites.

export interface AdminEntryProps {
  // Discriminates which side of the dispute this card represents. Drives
  // the winner comparison: `winner === side` ⇒ this card is the winner.
  side: 'original' | 'counter'
  // Postgres `decimal` columns arrive as strings; parse at the display
  // layer so cents survive the round trip (same convention as
  // PriceDisputesQueue — see PriceDisputesQueue.tsx line ~52).
  priceMin: string
  priceMax: string | null
  tier: Tier
  vendor: Vendor
  // Drives the inline trust pill rendered in the headline row beside
  // price + tier (gold for 'boxoffice', azure-tinted for 'standard',
  // neutral for 'resale'; null hides the pill entirely). The pill mirrors
  // the dispute-surfaces.jsx `PendingTrustPill` reference (design table §3b
  // line 214) and the kind→label map lives in copy.ts adminEntry.trustPill.
  sourceCategory: SourceCategory | null
  submitter: { handle: string | null }
  // ISO timestamp; rendered as raw string per design (§3b line 720
  // citation). The plan defers RelTime polish to a follow-up; the design
  // table doesn't specify relative rendering here.
  observedAt: string
  // Free-form structured pair; the display string is built in copy.ts so
  // pluralization stays out of JSX.
  confirms: { fans: number; admin: number } | null
  // Optional submitter-supplied note. When null, the entire note block
  // is omitted (§3b line 232 — "block omitted entirely").
  note: string | null
  // Discriminated by side: when `winner === side`, this card gets the
  // 2px accent border + "winner" badge. `null` = unresolved (no badge,
  // no accent on either side).
  winner: 'original' | 'counter' | null
}

// Design table §3b line 208 — `FormatRange(floor, ceiling)`.
// Matches PriceDisputesQueue.formatPriceRange for consistency: integers
// render without trailing ".00"; range collapses to single value when
// ceiling <= floor or ceiling is null.
const formatPriceRange = (floor: string, ceiling: string | null): string => {
  const floorNum = parseFloat(floor)
  const formatNum = (num: number): string =>
    Number.isInteger(num) ? `$${num}` : `$${num.toFixed(2)}`
  if (ceiling === null) return formatNum(floorNum)
  const ceilingNum = parseFloat(ceiling)
  if (ceilingNum > floorNum)
    return `${formatNum(floorNum)}–${formatNum(ceilingNum)}`
  return formatNum(floorNum)
}

// Repeated font stacks pulled out for readability; same convention as
// PriceDisputesQueue.tsx lines 65–66.
const INTER = 'Inter, system-ui'
const MONO = "'JetBrains Mono', monospace"

// AZ_D from dispute-surfaces.jsx (azure-dark accent). Used directly as
// a literal rather than a CSS var so the winner border matches the
// design source pixel-for-pixel. Same convention as the GOLD_Q / AZ_Q
// palette in PriceDisputesQueue.tsx.
const AZURE_DARK = 'oklch(0.62 0.12 240)'
// GOLD_D — gold accent for the box-office trust pill. Mirrors the
// pending-card.jsx pendingTokens map (`GOLD` literal at line 21) and
// the same constant the AdminDisputePanel uses for the keep-original
// button border.
const GOLD_DARK = 'oklch(0.66 0.14 78)'

// Trust pill — design property table §3b line 214 routes through the
// pending-card.jsx `PendingTrustPill` component, which maps a `kind`
// to a colored pill (gold for box office, azure for community). The
// SourceCategory discriminator we receive ('boxoffice' | 'standard' |
// 'resale') maps onto that pill: 'boxoffice' → gold, 'standard' →
// azure community, 'resale' → neutral azure with the 'Resale' label.
// Style values pulled from pending-card.jsx:108–124 so the pill
// renders 1:1 with the design source.
const trustPillStyle = (
  kind: SourceCategory,
): { background: string; color: string; border: string } => {
  if (kind === 'boxoffice') {
    return {
      background: `color-mix(in oklab, ${GOLD_DARK} 22%, transparent)`,
      color: GOLD_DARK,
      border: `1px solid color-mix(in oklab, ${GOLD_DARK} 60%, transparent)`,
    }
  }
  // 'standard' and 'resale' share the azure community-style treatment;
  // only the label changes (per copy.ts adminEntry.trustPill map).
  return {
    background: `color-mix(in oklab, ${AZURE_DARK} 16%, transparent)`,
    color: AZURE_DARK,
    border: 'none',
  }
}

export const AdminEntry: FC<AdminEntryProps> = ({
  side,
  priceMin,
  priceMax,
  tier,
  vendor,
  sourceCategory,
  submitter,
  observedAt,
  confirms,
  note,
  winner,
}) => {
  const isWinner = winner === side
  const handleDisplay =
    submitter.handle ?? REVIEW_CONTEST_COPY.adminEntry.anonymousHandle
  const confirmsDisplay = REVIEW_CONTEST_COPY.adminEntry.confirmsValue(
    confirms?.fans ?? 0,
    confirms?.admin ?? 0,
  )
  // Trust pill renders only when sourceCategory is known. Null comes
  // from older rows pre-PR #696 (the backfill assigned categories to
  // every row, but the type stays nullable for the wire shape).
  const trustPillTokens =
    sourceCategory !== null ? trustPillStyle(sourceCategory) : null
  const trustPillLabel =
    sourceCategory !== null
      ? REVIEW_CONTEST_COPY.adminEntry.trustPill[sourceCategory]
      : null

  return (
    <div
      // Card container — §3b lines 197–200 (padding / background /
      // border-radius / conditional border).
      style={{
        padding: '14px 16px',
        background: 'var(--surface-1)',
        border: isWinner
          ? `2px solid ${AZURE_DARK}`
          : '1px solid var(--border)',
        borderRadius: 12,
        position: 'relative',
      }}
    >
      {isWinner ? (
        <span
          // Winner badge — §3b lines 201–207. Absolute-positioned over
          // the top-left of the card, mono-uppercase pill on the AZ_D
          // accent.
          style={{
            position: 'absolute',
            top: -10,
            left: 12,
            padding: '3px 8px',
            background: AZURE_DARK,
            color: 'var(--fg-on-accent)',
            fontFamily: MONO,
            fontSize: 9,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            borderRadius: 4,
            lineHeight: 1,
          }}
        >
          {REVIEW_CONTEST_COPY.adminEntry.winnerBadge}
        </span>
      ) : null}

      {/* Headline row — price + tier + trust pill, all on one
          baseline-aligned line. Mirrors dispute-surfaces.jsx:693–706
          including the trust pill at the trailing edge. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <span
          // Price — §3b lines 208–210. Inter 30/800, letterSpacing
          // -0.025em, lineHeight 1.
          style={{
            fontFamily: INTER,
            fontWeight: 800,
            fontSize: 30,
            color: 'var(--fg)',
            letterSpacing: '-0.025em',
            lineHeight: 1,
          }}
        >
          {formatPriceRange(priceMin, priceMax)}
        </span>
        <span
          // Tier — §3b lines 211–213. Mono 11/700 uppercase, fg-muted.
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: 'var(--fg-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          {tier}
        </span>
        {trustPillTokens !== null && trustPillLabel !== null ? (
          <span
            // Trust pill — §3b line 214 + pending-card.jsx:108–124. Pill
            // shape mirrors PendingTrustPill so the dispute panel reads
            // 1:1 with the design source. Gold for box-office,
            // azure-tinted for community + resale; label discriminator
            // lives in copy.ts adminEntry.trustPill.
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              borderRadius: 4,
              background: trustPillTokens.background,
              color: trustPillTokens.color,
              border: trustPillTokens.border,
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 700,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {trustPillLabel}
          </span>
        ) : null}
      </div>

      {/* Metadata grid — §3b lines 215–224. Two-column grid: mono
          uppercase labels in fg-subtle, values in fg. The label-value
          pairing order matches dispute-surfaces.jsx:715–722. */}
      <div
        style={{
          marginTop: 8,
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '4px 12px',
          fontFamily: MONO,
          fontSize: 9.5,
          letterSpacing: '0.04em',
        }}
      >
        <span style={{ color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>
          {REVIEW_CONTEST_COPY.adminEntry.metadata.submitter}
        </span>
        <span style={{ color: 'var(--fg)' }}>{handleDisplay}</span>

        <span style={{ color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>
          {REVIEW_CONTEST_COPY.adminEntry.metadata.vendor}
        </span>
        <span style={{ color: 'var(--fg)' }}>{vendor}</span>

        <span style={{ color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>
          {REVIEW_CONTEST_COPY.adminEntry.metadata.observed}
        </span>
        <span style={{ color: 'var(--fg)' }}>
          <time dateTime={observedAt}>{observedAt}</time>
        </span>

        <span style={{ color: 'var(--fg-subtle)', textTransform: 'uppercase' }}>
          {REVIEW_CONTEST_COPY.adminEntry.metadata.confirms}
        </span>
        <span style={{ color: 'var(--fg)' }}>{confirmsDisplay}</span>
      </div>

      {note !== null ? (
        <div
          // Note block — §3b lines 225–231. Italic Inter on a 4% fg-tint
          // background with bordered radius. Curly quotes wrap the note
          // string per the design's `"{note}"` format (§3b line 229).
          style={{
            marginTop: 10,
            padding: '8px 10px',
            background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontFamily: INTER,
            fontSize: 12.5,
            color: 'var(--fg-muted)',
            letterSpacing: '-0.005em',
            lineHeight: 1.45,
            fontStyle: 'italic',
          }}
        >
          {`“${note}”`}
        </div>
      ) : null}
    </div>
  )
}
