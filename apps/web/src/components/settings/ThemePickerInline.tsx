'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useTheme } from '@/theme/ThemeProvider'
import { THEMES, THEME_META, type ThemeName } from '@/theme/themes'
import { patchMe } from '@/lib/users'

function MiniMark({
  tokens,
  size = 22,
}: {
  tokens: Record<string, string>
  size?: number
}) {
  const dotPositions: [number, number][] = [
    [14, 38],
    [18, 34],
    [22, 30],
    [26, 26],
    [30, 22],
    [34, 18],
    [14, 32],
  ]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect width="48" height="48" rx="10" fill={tokens['surface-2']} />
      <circle cx="34" cy="14" r="9" fill={tokens['accent']} opacity="0.22" />
      <circle cx="34" cy="14" r="5" fill={tokens['accent-2']} opacity="0.45" />
      <circle cx="34" cy="14" r="3" fill={tokens['signal']} />
      {dotPositions.map(([cx, cy], idx) => (
        <circle
          key={idx}
          cx={cx}
          cy={cy}
          r="1.6"
          fill={tokens['fg']}
          opacity={0.45 + idx * 0.07}
        />
      ))}
    </svg>
  )
}

function ThemeSwatch({
  name,
  active,
  onClick,
  disabled,
}: {
  name: ThemeName
  active: boolean
  onClick: () => void
  disabled?: boolean
}) {
  const tokens = THEMES[name]
  const meta = THEME_META[name]
  const hasDistinctAccent2 = tokens['accent-2'] !== tokens['accent']

  return (
    <button
      type="button"
      aria-label={`${meta.label} theme`}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      style={{
        all: 'unset',
        cursor: disabled ? 'wait' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 14,
        padding: 10,
        background: tokens['bg'],
        border: active
          ? `1.5px solid ${tokens['signal']}`
          : `1px solid ${tokens['border-strong']}`,
        transition: 'transform 120ms ease',
        minWidth: 0,
      }}
    >
      {/* Dots row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <MiniMark tokens={tokens} size={20} />
        <span style={{ display: 'flex', gap: 3 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: tokens['signal'],
              display: 'block',
            }}
          />
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: tokens['accent'],
              display: 'block',
            }}
          />
          {hasDistinctAccent2 && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: tokens['accent-2'],
                display: 'block',
              }}
            />
          )}
        </span>
        {active && (
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              fontWeight: 700,
              color: tokens['signal'],
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            active
          </span>
        )}
      </div>

      {/* Mini gig card */}
      <div
        style={{
          background: tokens['surface-1'],
          border: `1px solid ${tokens['border']}`,
          borderRadius: 8,
          padding: '6px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 10,
            fontWeight: 800,
            color: tokens['fg'],
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Habstrakt
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              fontWeight: 900,
              color: tokens['signal'],
              letterSpacing: '-0.02em',
            }}
          >
            $35
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 7,
              fontWeight: 700,
              color: tokens['fg-subtle'],
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
            }}
          >
            GA
          </span>
        </div>
      </div>

      {/* Label + role */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 11,
            fontWeight: 700,
            color: tokens['fg'],
            letterSpacing: '-0.005em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {meta.label}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 7,
            fontWeight: 600,
            color: tokens['fg-muted'],
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            marginLeft: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          {meta.role === 'base' ? meta.mode : meta.role}
        </span>
      </div>
    </button>
  )
}

export function ThemePickerInline() {
  const { theme, setTheme } = useTheme()
  const { getToken } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const activeMeta = THEME_META[theme]

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 480px)')
    setIsMobile(mql.matches)
    const handler = (ev: MediaQueryListEvent) => setIsMobile(ev.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  async function handleSelectTheme(name: ThemeName) {
    if (name === theme || isSaving) return
    const previous = theme
    setTheme(name)
    setIsSaving(true)
    try {
      const token = await getToken()
      if (token) {
        await patchMe(token, { theme: name })
      }
    } catch {
      setTheme(previous)
    } finally {
      setIsSaving(false)
    }
  }

  const themeKeys = Object.keys(THEMES) as ThemeName[]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header: label + active pill + count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            fontWeight: 800,
            color: 'var(--fg)',
            letterSpacing: '-0.005em',
          }}
        >
          Theme
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            color: 'var(--fg)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            padding: '2px 6px',
            background: 'var(--surface-2)',
            borderRadius: 4,
          }}
        >
          {activeMeta.label}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            color: 'var(--fg-muted)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          9 themes
        </span>
      </div>

      {/* Grid (desktop) or horizontal scroll (mobile) */}
      <div
        style={{
          opacity: isSaving ? 0.7 : 1,
          transition: 'opacity 120ms',
          ...(isMobile
            ? {
                display: 'flex',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling:
                  'touch' as React.CSSProperties['WebkitOverflowScrolling'],
                gap: 8,
                paddingBottom: 4,
              }
            : {
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
              }),
        }}
      >
        {themeKeys.map((name) =>
          isMobile ? (
            <div
              key={name}
              style={{ flex: '0 0 150px', scrollSnapAlign: 'start' }}
            >
              <ThemeSwatch
                name={name}
                active={theme === name}
                disabled={isSaving}
                onClick={() => void handleSelectTheme(name)}
              />
            </div>
          ) : (
            <ThemeSwatch
              key={name}
              name={name}
              active={theme === name}
              disabled={isSaving}
              onClick={() => void handleSelectTheme(name)}
            />
          ),
        )}
      </div>
    </div>
  )
}
