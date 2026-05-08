'use client'

import { useState } from 'react'
import type { PriceSource } from '@concert-crawl/types'

interface PriceDisplayProps {
  priceMin: string | null
  priceMax: string | null
  priceSource: PriceSource | null
  venueName: string
  ticketUrl: string | null
}

type SourceKind = 'primary' | 'resale' | 'community'

function resolveSourceKind(source: PriceSource | null): SourceKind {
  if (source === 'seatgeek') return 'resale'
  if (source === 'community') return 'community'
  return 'primary'
}

function resolveSourceName(
  source: PriceSource | null,
  venueName: string,
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
      return null
  }
}

function formatFace(face: number, max: number | null): string {
  if (max && max > face) return `$${Math.round(face)}–$${Math.round(max)}`
  return `$${Math.round(face)}`
}

// ── Custom SVG glyphs (1.2–1.4px stroke, matches consumer system) ─

function ExternalIcon() {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" fill="none" aria-hidden>
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

function BellIcon() {
  return (
    <svg width={11} height={11} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M3 6.5C3 4.3 4.8 2.5 7 2.5S11 4.3 11 6.5V8L12 10H2L3 8V6.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 11.5C5.5 12.3 6.2 13 7 13S8.5 12.3 8.5 11.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M7 1V2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ── TrustMark — one-word inline pill for resale / community ──────

function TrustMark({ kind }: { kind: SourceKind }) {
  if (kind !== 'resale' && kind !== 'community') return null
  const label = kind === 'resale' ? 'resale' : 'community'
  const color = kind === 'resale' ? 'var(--warning)' : 'var(--fg-muted)'
  const bg =
    kind === 'resale'
      ? 'color-mix(in oklab, var(--warning) 14%, transparent)'
      : 'color-mix(in oklab, var(--fg-muted) 12%, transparent)'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        borderRadius: 4,
        background: bg,
        color,
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        verticalAlign: 'middle',
      }}
    >
      {label}
    </span>
  )
}

// ── SourceLink — attribution with optional external link ─────────

function SourceLink({ name, url }: { name: string; url: string | null }) {
  const baseStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: 'var(--fg-subtle)',
    letterSpacing: '0.04em',
  }
  if (!url) {
    return <span style={baseStyle}>{name}</span>
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        ...baseStyle,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        textDecoration: 'none',
      }}
    >
      {name}
      <ExternalIcon />
    </a>
  )
}

// ── WatchAffordance — local state only, no backend yet ───────────

function WatchAffordance() {
  const [watching, setWatching] = useState(false)
  return (
    <button
      onClick={() => setWatching((prev) => !prev)}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: watching ? 'var(--accent)' : 'var(--fg-subtle)',
        letterSpacing: '0.02em',
      }}
    >
      <BellIcon />
      <span>{watching ? 'On it' : 'Yell if it drops'}</span>
    </button>
  )
}

// ── Editorial sentence — PriceBlockC ported to available data ────

export function PriceDisplay({
  priceMin,
  priceMax,
  priceSource,
  venueName,
  ticketUrl,
}: PriceDisplayProps) {
  const kind = resolveSourceKind(priceSource)
  const sourceName = resolveSourceName(priceSource, venueName)
  const parsedMin = priceMin ? parseFloat(priceMin) : null
  const parsedMax = priceMax ? parseFloat(priceMax) : null
  const face = parsedMin !== null && !isNaN(parsedMin) ? parsedMin : null
  const max = parsedMax !== null && !isNaN(parsedMax) ? parsedMax : null
  const isAxs = ticketUrl?.includes('axs.com') ?? false

  const sectionStyle: React.CSSProperties = {
    padding: '12px 0',
    borderTop: '1px solid var(--border)',
    borderBottom: '1px solid var(--border)',
  }

  const editorialText: React.CSSProperties = {
    fontFamily: 'var(--font-ui)',
    fontSize: 13,
    lineHeight: 1.45,
    color: 'var(--fg-muted)',
    letterSpacing: '-0.01em',
  }

  // No price
  if (!face) {
    const headline = isAxs
      ? "AXS doesn't share pricing publicly."
      : 'Price: who knows.'
    const subline = isAxs
      ? 'Check their site closer to the show or call the box office.'
      : "We'll yell once tickets actually exist."
    return (
      <div style={sectionStyle}>
        <p style={editorialText}>
          {headline}{' '}
          <span style={{ color: 'var(--fg-subtle)' }}>{subline}</span>
        </p>
      </div>
    )
  }

  const faceStr = formatFace(face, max)

  // Community source
  if (kind === 'community') {
    return (
      <div style={sectionStyle}>
        <div style={{ marginBottom: 4 }}>
          <TrustMark kind="community" />
        </div>
        <p style={editorialText}>
          <span>Reported at </span>
          <span style={{ color: 'var(--fg)', fontWeight: 700 }}>{faceStr}</span>
          <span> face. </span>
          <span style={{ color: 'var(--fg-subtle)' }}>
            Single fan submission — not yet verified.
          </span>
        </p>
        <div style={{ marginTop: 6 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.04em',
              fontStyle: 'italic',
            }}
          >
            anonymous fan
          </span>
        </div>
      </div>
    )
  }

  // Resale source (SeatGeek)
  if (kind === 'resale') {
    return (
      <div style={sectionStyle}>
        <div style={{ marginBottom: 4 }}>
          <TrustMark kind="resale" />
        </div>
        <p style={editorialText}>
          <span>Cheapest resale: </span>
          <span style={{ color: 'var(--fg)', fontWeight: 700 }}>{faceStr}</span>
          <span>. </span>
          <span style={{ color: 'var(--fg-subtle)' }}>
            Face value not published — couldn&apos;t pull one from the primary
            listing.
          </span>
        </p>
        {sourceName && (
          <div style={{ marginTop: 6 }}>
            <SourceLink name={sourceName} url={ticketUrl} />
          </div>
        )}
      </div>
    )
  }

  // Primary source (default)
  return (
    <div style={sectionStyle}>
      <p style={editorialText}>
        <span style={{ color: 'var(--fg)', fontWeight: 700 }}>{faceStr}</span>
        <span> face.</span>
        {isAxs && (
          <span style={{ color: 'var(--fg-subtle)' }}>
            {' '}
            AXS doesn&apos;t list face value publicly — this may be an estimate.
          </span>
        )}
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 6,
          flexWrap: 'wrap',
        }}
      >
        {sourceName && <SourceLink name={sourceName} url={ticketUrl} />}
        <span
          style={{
            color: 'var(--fg-subtle)',
            opacity: 0.4,
            marginLeft: 'auto',
          }}
        >
          ·
        </span>
        <WatchAffordance />
      </div>
    </div>
  )
}
