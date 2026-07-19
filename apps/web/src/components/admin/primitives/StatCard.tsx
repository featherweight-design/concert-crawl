'use client'

import * as LucideIcons from 'lucide-react'
import type { StatusKind } from './utils'
import { KIND_COLORS } from './utils'

interface StatCardProps {
  label: string
  value: string
  unit?: string
  hint?: string
  trend?: { dir: 'up' | 'down'; text: string; good: boolean }
  kind?: StatusKind
  iconName: string
  mono?: boolean
  noChip?: boolean
  footer?: React.ReactNode
  onClick?: () => void
  /**
   * Tighten the value's font-size for cards that render an atypically long
   * numeric string — e.g. LLM Cost Today ($0.3113 wraps mid-value on narrow
   * tiles at the default clamp). Affects only the value; label/unit/trend
   * stay put (#1078).
   */
  compact?: boolean
}

export const StatCard = ({
  label,
  value,
  unit,
  hint,
  trend,
  kind = 'neutral',
  iconName,
  mono = true,
  noChip = false,
  footer,
  onClick,
  compact = false,
}: StatCardProps) => {
  const Icon = (
    LucideIcons as unknown as Record<
      string,
      React.ComponentType<{ size: number; color: string }>
    >
  )[iconName]
  const colors = KIND_COLORS[kind]

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      {/* Icon pinned to top-right; removed from flex flow so it never displaces content */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 32,
          height: 32,
          borderRadius: 8,
          background: noChip ? 'transparent' : colors.bg,
          border: noChip ? 'none' : `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {Icon && (
          <Icon size={15} color={noChip ? 'var(--fg-subtle)' : colors.fg} />
        )}
      </div>

      {/* Content — right-padded so text never runs under the icon */}
      <div style={{ paddingRight: 44 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.07em',
            color: 'var(--fg-muted)',
            marginBottom: 8,
          }}
        >
          {label}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            minWidth: 0,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: mono
                ? "'JetBrains Mono', monospace"
                : 'var(--admin-font, Inter, sans-serif)',
              // Fluid so the value shrinks on narrow tiles (≤320px) instead
              // of overflowing the card; caps at the original 38px on wide
              // viewports. `compact` tightens the clamp for cards whose
              // value can grow past ~6 chars (currency w/ sub-cent precision).
              fontSize: compact
                ? 'clamp(18px, 5vw, 28px)'
                : 'clamp(24px, 6.5vw, 38px)',
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              color: 'var(--fg)',
              minWidth: 0,
              // The default `overflowWrap: 'anywhere'` lets long values
              // shrink AND break mid-string as a fallback — fine for
              // arbitrary text. `compact` cards render currency /
              // numeric strings that must never split (the original
              // symptom in #1078 was `$0.3113` breaking between the
              // 2nd and 3rd trailing digit), so lock them to a single
              // line and let the tighter clamp handle overflow. Belt-
              // and-braces: an unexpectedly long value on a narrow tile
              // could still exceed the clamp minimum, so add
              // `overflow: hidden` + `textOverflow: ellipsis` to keep
              // the card's layout stable rather than letting the value
              // spill onto adjacent UI.
              overflowWrap: compact ? 'normal' : 'anywhere',
              whiteSpace: compact ? 'nowrap' : undefined,
              overflow: compact ? 'hidden' : undefined,
              textOverflow: compact ? 'ellipsis' : undefined,
            }}
          >
            {value}
          </span>
          {unit && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 'clamp(12px, 3vw, 14px)',
                fontWeight: 600,
                color: 'var(--fg-muted)',
              }}
            >
              {unit}
            </span>
          )}
          {trend && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                marginLeft: 'auto',
                color: trend.good ? 'var(--success)' : 'var(--danger)',
              }}
            >
              {trend.dir === 'up' ? '↑' : '↓'} {trend.text}
            </span>
          )}
        </div>
        {hint && (
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
            {hint}
          </div>
        )}
      </div>

      {footer && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: 12,
            marginTop: 4,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  )
}
