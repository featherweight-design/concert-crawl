'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { THEMES, THEME_META, type ThemeName } from '@/theme/themes'
import { MiniMark } from '@/theme/MiniMark'
import { ThemeSwatch } from '@/theme/ThemeSwatch'
import { Eyebrow, Lede, StepHeading } from './_primitives'

const THEME_KEYS = Object.keys(THEMES) as ThemeName[]

function subLabel(meta: (typeof THEME_META)[ThemeName]): string {
  return meta.role === 'base' ? `${meta.mode} · base` : meta.role
}

function HeroStrip({ themeName }: { themeName: ThemeName }) {
  const tokens = THEMES[themeName]
  const meta = THEME_META[themeName]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
        gap: 14,
        background: tokens['bg'],
        borderRadius: 14,
        padding: 16,
        border: `1px solid ${tokens['border-strong']}`,
      }}
    >
      {/* Left: identity */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <MiniMark tokens={tokens} size={32} />
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8,
            fontWeight: 700,
            color: tokens['signal'],
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          Currently using
        </div>
        <div
          style={{
            fontFamily: 'Inter, system-ui',
            fontSize: 20,
            fontWeight: 800,
            color: tokens['fg'],
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          {meta.label}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            fontWeight: 600,
            color: tokens['fg-muted'],
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          {subLabel(meta)}
        </div>
      </div>

      {/* Right: larger gig card preview */}
      <div
        style={{
          background: tokens['surface-1'],
          border: `1px solid ${tokens['border']}`,
          borderRadius: 10,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {/* Venue / time header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              color: tokens['signal'],
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Tonight
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 600,
              color: tokens['fg-subtle'],
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
            }}
          >
            Ogden · 9PM
          </span>
        </div>

        {/* Artist */}
        <div
          style={{
            fontFamily: 'Inter, system-ui',
            fontSize: 18,
            fontWeight: 900,
            color: tokens['fg'],
            letterSpacing: '-0.02em',
          }}
        >
          The Midnight
        </div>

        {/* Price + Watch */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              fontFamily: 'Inter, system-ui',
              fontSize: 22,
              fontWeight: 900,
              color: tokens['signal'],
              letterSpacing: '-0.02em',
            }}
          >
            $35
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              color: tokens['fg-subtle'],
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
            }}
          >
            GA · 21+
          </span>
          <span
            style={{
              marginLeft: 'auto',
              padding: '4px 10px',
              background: tokens['signal'],
              color: tokens['bg'],
              fontFamily: 'Inter, system-ui',
              fontSize: 11,
              fontWeight: 800,
              borderRadius: 6,
            }}
          >
            Watch
          </span>
        </div>
      </div>
    </div>
  )
}

function CompactStrip({ themeName }: { themeName: ThemeName }) {
  const tokens = THEMES[themeName]
  const meta = THEME_META[themeName]

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${tokens['border-strong']}`,
        background: tokens['bg'],
        padding: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <MiniMark tokens={tokens} size={26} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8,
            fontWeight: 700,
            color: tokens['signal'],
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Currently using
        </span>
        <span
          style={{
            fontFamily: 'Inter, system-ui',
            fontSize: 16,
            fontWeight: 800,
            color: tokens['fg'],
            letterSpacing: '-0.02em',
          }}
        >
          {meta.label}
        </span>
      </div>
    </div>
  )
}

export function MakeItYours() {
  const { theme, setTheme } = useTheme()
  const [hasSelected, setHasSelected] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 480px)')
    setIsMobile(mql.matches)
    const handler = (ev: MediaQueryListEvent) => setIsMobile(ev.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  function handleSelect(name: ThemeName) {
    setTheme(name)
    localStorage.setItem('cc-onboarding-theme-pending', '1')
    setHasSelected(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Eyebrow>Make it yours</Eyebrow>
      <StepHeading>Pick your look.</StepHeading>
      <Lede>
        Nine themes. Pick the one that feels right — you can always change it in
        Settings.
      </Lede>

      {hasSelected &&
        (isMobile ? (
          <CompactStrip themeName={theme} />
        ) : (
          <HeroStrip themeName={theme} />
        ))}

      {/* Swatch grid (desktop) or scroll-snap carousel (mobile) */}
      <div
        style={
          isMobile
            ? {
                display: 'flex',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                gap: 10,
                margin: '0 -22px',
                padding: '0 22px 6px',
              }
            : {
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
              }
        }
      >
        {THEME_KEYS.map((name) =>
          isMobile ? (
            <div
              key={name}
              style={{ flex: '0 0 160px', scrollSnapAlign: 'start' }}
            >
              <ThemeSwatch
                name={name}
                active={theme === name}
                onClick={() => handleSelect(name)}
              />
            </div>
          ) : (
            <ThemeSwatch
              key={name}
              name={name}
              active={theme === name}
              onClick={() => handleSelect(name)}
            />
          ),
        )}
      </div>
    </div>
  )
}
