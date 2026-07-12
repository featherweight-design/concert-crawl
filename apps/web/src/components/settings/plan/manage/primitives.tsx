// Shared visual primitives for the #780 manage sheet + lifecycle flows —
// MonoEyebrow, RailHeader, FlowButton, FinePrint, InfoCard, MathRow, all
// verbatim from design/design_handoff_monetization_lifecycle (property
// tables lifecycle-manage.md / lifecycle-flows.md). Inter is the app-wide
// body font (inherited); mono runs through var(--font-mono).

import type { CSSProperties, ReactNode } from 'react'

export const MonoEyebrow = ({
  children,
  color = 'var(--fg-subtle)',
  size = 10,
  letterSpacing = '0.14em',
  style,
}: {
  children: ReactNode
  color?: string
  size?: number
  letterSpacing?: string
  style?: CSSProperties
}) => (
  <div
    style={{
      fontFamily: 'var(--font-mono)',
      fontSize: size,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing,
      color,
      ...style,
    }}
  >
    {children}
  </div>
)

export type RailTone = 'signal' | 'accent' | 'muted'

const RAIL_TONE_COLOR: Record<RailTone, string> = {
  signal: 'var(--signal)',
  accent: 'var(--accent)',
  muted: 'var(--fg-subtle)',
}

export const RailHeader = ({
  tone,
  eyebrow,
  code,
}: {
  tone: RailTone
  eyebrow: string
  code?: string
}) => {
  const toneColor = RAIL_TONE_COLOR[tone]
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 6,
          background: toneColor,
          flexShrink: 0,
          boxShadow: `0 0 8px ${toneColor}`,
        }}
      />
      <MonoEyebrow color={toneColor} letterSpacing="0.16em">
        {eyebrow}
      </MonoEyebrow>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      {code !== undefined && (
        <MonoEyebrow letterSpacing="0.14em">{code}</MonoEyebrow>
      )}
    </div>
  )
}

export const FlowButton = ({
  label,
  kind = 'primary',
  accent = 'var(--signal)',
  glow = false,
  sub,
  disabled = false,
  onClick,
}: {
  label: string
  kind?: 'primary' | 'ghost'
  accent?: string
  glow?: boolean
  sub?: string
  disabled?: boolean
  onClick: () => void
}) => {
  const primary = kind === 'primary'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        all: 'unset',
        // Restore the native :focus-visible ring wiped by all:unset so
        // keyboard focus stays visible (same pattern as PriceDisputesQueue).
        outline: 'revert',
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'center',
        boxSizing: 'border-box',
        width: '100%',
        padding: '13px 16px',
        borderRadius: 12,
        background: primary ? accent : 'transparent',
        color: primary ? 'var(--fg-on-accent)' : 'var(--fg-muted)',
        border: primary ? 'none' : '1px solid var(--border-strong)',
        fontWeight: primary ? 800 : 700,
        fontSize: 14.5,
        boxShadow:
          primary && glow
            ? `0 0 18px color-mix(in oklch, ${accent} 28%, transparent)`
            : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span>{label}</span>
      {sub && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            fontSize: 9,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: 0.85,
          }}
        >
          {sub}
        </span>
      )}
    </button>
  )
}

export const FinePrint = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      textAlign: 'center',
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      color: 'var(--fg-subtle)',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    }}
  >
    {children}
  </div>
)

export type InfoCardTone = 'neutral' | 'signal' | 'accent'

export const InfoCard = ({
  tone = 'neutral',
  children,
}: {
  tone?: InfoCardTone
  children: ReactNode
}) => {
  const toneColor = tone === 'signal' ? 'var(--signal)' : 'var(--accent)'
  return (
    <div
      style={{
        padding: '13px 14px',
        borderRadius: 12,
        background:
          tone === 'neutral'
            ? 'var(--surface-1)'
            : `color-mix(in oklch, ${toneColor} 7%, var(--surface-1))`,
        border: `1px solid ${
          tone === 'neutral'
            ? 'var(--border)'
            : `color-mix(in oklch, ${toneColor} 30%, var(--border))`
        }`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {children}
    </div>
  )
}

export const MathRow = ({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
    }}
  >
    <span
      style={{
        fontWeight: strong ? 700 : 500,
        fontSize: 13,
        color: strong ? 'var(--fg)' : 'var(--fg-muted)',
        letterSpacing: '-0.005em',
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontWeight: strong ? 900 : 700,
        fontSize: strong ? 16 : 13.5,
        letterSpacing: '-0.02em',
        color: 'var(--fg)',
      }}
    >
      {value}
    </span>
  </div>
)

/** Mutation-failure line — design defines no error states, so this follows
 * the tier-picker convention (role="alert", danger-toned). */
export const ErrorLine = ({ text }: { text: string }) => (
  <div
    role="alert"
    style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}
  >
    {text}
  </div>
)
