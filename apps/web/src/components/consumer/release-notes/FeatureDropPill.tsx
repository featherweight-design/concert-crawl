'use client'

import type { Release } from '@/lib/definitions/releases'

interface FeatureDropPillProps {
  release: Release
  onOpen: () => void
  onDismiss?: () => void
  variant?: 'desktop' | 'mobile'
}

export function FeatureDropPill({
  release,
  onOpen,
  onDismiss,
  variant = 'desktop',
}: FeatureDropPillProps) {
  const sp = release.spotlight
  if (!sp) return null

  const isMobile = variant === 'mobile'

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: isMobile ? '8px 12px 8px 10px' : '10px 14px 10px 12px',
        borderRadius: 999,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--accent)',
        boxShadow:
          '0 12px 32px rgba(0,0,0,0.45), 0 0 0 4px var(--overlay-hover)',
        color: 'var(--fg)',
        fontFamily: 'var(--font-ui)',
        position: 'relative',
        animation: 'rnFadeUp 600ms cubic-bezier(.2,.8,.2,1) both',
      }}
    >
      {/* radar dot */}
      <span
        style={{
          position: 'relative',
          width: 14,
          height: 14,
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 14,
            background: 'var(--accent)',
            opacity: 0.35,
            animation: 'rnRadar 1.8s ease-out infinite',
          }}
        />
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 8,
            background: 'var(--accent)',
            boxShadow: '0 0 8px var(--accent)',
          }}
        />
      </span>

      {/* text */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 800,
            color: 'var(--accent)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          Feature drop
        </span>
        <span
          style={{
            fontSize: isMobile ? 13 : 14,
            fontWeight: 700,
            letterSpacing: '-0.015em',
            color: 'var(--fg)',
            whiteSpace: 'nowrap',
          }}
        >
          {sp.title}
        </span>
      </div>

      {/* dismiss X */}
      {onDismiss && (
        <span
          role="button"
          tabIndex={0}
          onClick={(ev) => {
            ev.stopPropagation()
            onDismiss()
          }}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.stopPropagation()
              onDismiss()
            }
          }}
          aria-label="Dismiss"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: 11,
            color: 'var(--fg-subtle)',
            marginLeft: 2,
            cursor: 'pointer',
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
          >
            <path
              d="M3 3l6 6M9 3l-6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
    </button>
  )
}
