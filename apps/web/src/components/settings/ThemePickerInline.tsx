'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useTheme } from '@/theme/ThemeProvider'
import { THEMES, THEME_META, type ThemeName } from '@/theme/themes'
import { MiniMark } from '@/theme/MiniMark'
import { patchMe } from '@/lib/users'

export function ThemeSwatch({
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
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
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
            · GA
          </span>
        </div>
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
      {/* Header: label + active name + hint */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
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
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.06em',
          }}
        >
          {activeMeta.label}
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
