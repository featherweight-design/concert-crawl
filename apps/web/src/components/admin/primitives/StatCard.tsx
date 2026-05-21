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
  footer?: React.ReactNode
  onClick?: () => void
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
  footer,
  onClick,
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
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.07em',
              color: 'var(--fg-muted)',
              marginBottom: 10,
            }}
          >
            {label}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span
              style={{
                fontFamily: mono
                  ? "'JetBrains Mono', monospace"
                  : 'var(--admin-font, Inter, sans-serif)',
                fontSize: 30,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
                color: 'var(--fg)',
              }}
            >
              {value}
            </span>
            {unit && (
              <span style={{ fontSize: 16, color: 'var(--fg-muted)' }}>
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
            <div
              style={{ marginTop: 4, fontSize: 12, color: 'var(--fg-muted)' }}
            >
              {hint}
            </div>
          )}
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: colors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {Icon && <Icon size={20} color={colors.fg} />}
        </div>
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
