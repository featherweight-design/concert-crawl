'use client'

import type { Release, ReleaseItem } from '@/lib/definitions/releases'
import { SpotlightHero } from './SpotlightHero'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const COPY = CONSUMER_COPY.releaseNotes

const KIND_LABEL: Record<ReleaseItem['kind'], string> = {
  added: 'Added',
  fixed: 'Fixed',
  changed: 'Changed',
  removed: 'Removed',
}

const KIND_COLOR: Record<ReleaseItem['kind'], string> = {
  added: 'var(--success)',
  fixed: 'var(--signal)',
  changed: 'var(--fg-muted)',
  removed: 'var(--warning)',
}

interface ReleaseEntryProps {
  release: Release
  isLatest?: boolean
  onOpenSpotlight?: (release: Release) => void
}

export function ReleaseEntry({
  release,
  isLatest = false,
  onOpenSpotlight,
}: ReleaseEntryProps) {
  return (
    <div style={{ position: 'relative', paddingLeft: 36, paddingBottom: 36 }}>
      {/* timeline node */}
      <div
        style={{
          position: 'absolute',
          left: 6,
          top: 6,
          width: 11,
          height: 11,
          borderRadius: 11,
          background: isLatest ? 'var(--signal)' : 'var(--bg)',
          border: `1.5px solid ${isLatest ? 'var(--signal)' : 'var(--border-strong)'}`,
          boxShadow: isLatest ? '0 0 8px var(--signal)' : 'none',
        }}
      />

      {/* meta line */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            fontWeight: 800,
            color: 'var(--fg)',
            letterSpacing: '0.02em',
          }}
        >
          {release.version}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          {release.date}
        </span>
        {isLatest && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 800,
              color: 'var(--signal)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              padding: '2px 6px',
              border: '1px solid var(--signal)',
              borderRadius: 3,
            }}
          >
            {COPY.entry.liveBadge}
          </span>
        )}
      </div>

      {/* spotlight strip */}
      {release.spotlight && (
        <SpotlightStrip
          release={release}
          onOpen={() => onOpenSpotlight?.(release)}
        />
      )}

      {/* headline */}
      {release.headline && (
        <div
          style={{
            fontSize: 19,
            fontWeight: 700,
            color: 'var(--fg)',
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            marginBottom: 10,
          }}
        >
          {release.headline}
        </div>
      )}

      {/* items grouped by kind */}
      {(['added', 'fixed', 'changed', 'removed'] as const).map((kind) =>
        release.items
          .filter((item) => item.kind === kind)
          .map((item, idx) => (
            <ReleaseItemRow key={`${kind}-${idx}`} item={item} />
          )),
      )}
    </div>
  )
}

function SpotlightStrip({
  release,
  onOpen,
}: {
  release: Release
  onOpen: () => void
}) {
  const sp = release.spotlight
  if (!sp) return null

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'block',
        width: '100%',
        marginBottom: 18,
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid var(--border-strong)',
        background: 'var(--bg-elevated)',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 200px) minmax(0, 1fr)',
          minHeight: 132,
        }}
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '14px 0 0 14px',
          }}
        >
          <SpotlightHero hero={sp.hero} compact />
        </div>

        <div
          style={{
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {COPY.entry.spotlightEyebrow}
          </span>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
              lineHeight: 1.2,
            }}
          >
            {sp.title}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--signal)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginTop: 4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {COPY.entry.spotlightCta}
            <svg
              width="9"
              height="9"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
            >
              <path
                d="M4 3l4 3-4 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </button>
  )
}

function ReleaseItemRow({ item }: { item: ReleaseItem }) {
  const label = KIND_LABEL[item.kind]
  const color = KIND_COLOR[item.kind]

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '9px 0',
        alignItems: 'flex-start',
      }}
    >
      <div style={{ paddingTop: 2 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 800,
            color,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            padding: '2px 6px',
            borderRadius: 3,
            border: `1px solid ${color}`,
            opacity: 0.85,
            flexShrink: 0,
            lineHeight: 1.2,
            display: 'inline-block',
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 14,
          lineHeight: 1.5,
          color: 'var(--fg)',
          letterSpacing: '-0.005em',
        }}
      >
        {item.text}
      </div>
    </div>
  )
}
