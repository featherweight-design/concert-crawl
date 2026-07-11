'use client'

// Shared CTA button — one visual system across the desktop card and the
// mobile accordion (design handoff TierCtaButton).

import { tierShell, stampColor } from './lib/tier-shell'
import type { TierCta, TierKey } from './definitions/types'

interface TierCtaButtonProps {
  tierKey: TierKey
  cta: TierCta
  onSelect: (tierKey: TierKey, cta: TierCta) => void
}

export const TierCtaButton = ({
  tierKey,
  cta,
  onSelect,
}: TierCtaButtonProps) => {
  const shell = tierShell(tierKey)
  const stamp = stampColor(shell)

  const background =
    cta.tone === 'signal'
      ? 'var(--signal)'
      : cta.tone === 'founder'
        ? 'linear-gradient(135deg, var(--signal), color-mix(in oklch, var(--accent) 60%, var(--signal)))'
        : cta.tone === 'current'
          ? 'var(--surface-2)'
          : 'transparent'
  const color =
    cta.tone === 'signal' || cta.tone === 'founder'
      ? 'var(--fg-on-accent)'
      : cta.tone === 'current'
        ? 'var(--fg)'
        : cta.tone === 'ghost-accent'
          ? 'var(--accent)'
          : 'var(--fg-muted)'
  const border =
    cta.tone === 'current'
      ? `1px solid ${stamp}`
      : cta.tone === 'ghost-accent'
        ? '1px solid color-mix(in oklch, var(--accent) 50%, var(--border-strong))'
        : cta.tone === 'ghost'
          ? '1px solid var(--border)'
          : '1px solid transparent'

  return (
    <button
      type="button"
      disabled={cta.disabled}
      onClick={() => onSelect(tierKey, cta)}
      style={{
        cursor: cta.disabled ? 'default' : 'pointer',
        textAlign: 'center',
        padding: '11px 14px',
        borderRadius: 10,
        width: '100%',
        boxSizing: 'border-box',
        fontWeight: 700,
        fontSize: 13.5,
        letterSpacing: '-0.005em',
        opacity: cta.disabled ? 0.55 : 1,
        background,
        color,
        border,
        boxShadow:
          cta.tone === 'founder'
            ? '0 0 18px color-mix(in oklch, var(--accent) 30%, transparent)'
            : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      {cta.tone === 'current' && !cta.disabled && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          style={{ color: stamp }}
          aria-hidden
        >
          <path
            d="M2 6 L5 9 L10 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span>{cta.label}</span>
    </button>
  )
}
