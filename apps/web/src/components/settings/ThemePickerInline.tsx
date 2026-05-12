'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useTheme } from '@/theme/ThemeProvider'
import { THEMES, THEME_META, type ThemeName } from '@/theme/themes'
import { patchMe } from '@/lib/users'

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

  return (
    <button
      type="button"
      aria-label={`${meta.label} theme`}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className="theme-swatch-btn"
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
          ? `2px solid ${tokens['signal']}`
          : `1px solid ${tokens['border-strong']}`,
        boxShadow: active
          ? `0 0 0 4px color-mix(in oklch, ${tokens['signal']} 14%, transparent)`
          : 'none',
        transition: 'transform 120ms ease',
        minWidth: 0,
      }}
    >
      {/* Dots row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            background: tokens['signal'],
            display: 'block',
          }}
        />
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            background: tokens['accent'],
            display: 'block',
          }}
        />
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            background: tokens['fg-muted'],
            opacity: 0.6,
            display: 'block',
          }}
        />
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
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            fontWeight: 700,
            color: tokens['fg-muted'],
            letterSpacing: '0.04em',
          }}
        >
          $35 · GA
        </span>
      </div>

      {/* Label */}
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
    </button>
  )
}

export function ThemePickerInline() {
  const { theme, setTheme } = useTheme()
  const { getToken } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header: paint icon + label + hint */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
          style={{ color: 'var(--fg-muted)', flexShrink: 0 }}
        >
          <path
            d="M2 13.5c1-1 2-2 3-1.5s2.5 2 4 0c1-1.3 2-3 2-4.5a5 5 0 00-10 0c0 1 .3 2 1 3z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <circle cx="6" cy="8" r="1" fill="currentColor" />
          <circle cx="10" cy="8" r="1" fill="currentColor" />
        </svg>
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
            marginLeft: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 600,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.06em',
          }}
        >
          tap to switch
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
