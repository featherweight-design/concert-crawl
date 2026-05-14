'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useTheme } from '@/theme/ThemeProvider'
import { THEMES, THEME_META, type ThemeName } from '@/theme/themes'
import { ThemeSwatch } from '@/theme/ThemeSwatch'
import { patchMe } from '@/lib/users'

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
