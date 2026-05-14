'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { THEMES, THEME_META, type ThemeName } from '@/theme/themes'
import { MiniMark } from '@/theme/MiniMark'
import { ThemeSwatch } from '@/components/settings/ThemePickerInline'
import { Eyebrow, Lede, StepHeading } from './_primitives'

const THEME_KEYS = Object.keys(THEMES) as ThemeName[]

function HeroStrip({ themeName }: { themeName: ThemeName }) {
  const tokens = THEMES[themeName]
  const meta = THEME_META[themeName]

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${tokens['border-strong']}`,
        background: tokens['bg-elevated'],
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      {/* Left: identity */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}
      >
        <MiniMark tokens={tokens} size={32} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              color: tokens['accent'],
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
            }}
          >
            Currently using
          </div>
          <div
            style={{
              fontFamily: 'Inter, system-ui',
              fontSize: 18,
              fontWeight: 900,
              color: tokens['fg'],
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {meta.label}
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 600,
              color: tokens['fg-subtle'],
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {meta.mode} · {meta.role}
          </div>
        </div>
      </div>

      {/* Right: mini gig card preview */}
      <div
        style={{
          flexShrink: 0,
          width: 110,
          borderRadius: 10,
          border: `1px solid ${tokens['border']}`,
          background: tokens['surface-1'],
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div
          style={{
            fontFamily: 'Inter, system-ui',
            fontSize: 11,
            fontWeight: 800,
            color: tokens['fg'],
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          The Midnight
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span
            style={{
              fontFamily: 'Inter, system-ui',
              fontSize: 14,
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
              fontSize: 8,
              fontWeight: 700,
              color: tokens['fg-subtle'],
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
            }}
          >
            · GA
          </span>
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8,
            fontWeight: 600,
            color: tokens['fg-muted'],
            letterSpacing: '0.06em',
          }}
        >
          Ogden · Fri
        </div>
        <div
          style={{
            marginTop: 2,
            padding: '4px 0',
            borderRadius: 5,
            background: tokens['signal'],
            fontFamily: 'Inter, system-ui',
            fontSize: 9,
            fontWeight: 800,
            color: tokens['fg-on-accent'],
            letterSpacing: '-0.005em',
            textAlign: 'center',
          }}
        >
          Watch
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
        borderRadius: 10,
        border: `1px solid ${tokens['border-strong']}`,
        background: tokens['bg-elevated'],
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <MiniMark tokens={tokens} size={26} />
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          fontWeight: 700,
          color: tokens['accent'],
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        Currently using
      </div>
      <div
        style={{
          fontFamily: 'Inter, system-ui',
          fontSize: 14,
          fontWeight: 900,
          color: tokens['fg'],
          letterSpacing: '-0.02em',
          whiteSpace: 'nowrap',
        }}
      >
        {meta.label}
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

      {/* Swatch grid (desktop) or scroll-snap row (mobile) */}
      <div
        style={
          isMobile
            ? {
                display: 'flex',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                gap: 8,
                paddingBottom: 4,
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
              style={{ flex: '0 0 150px', scrollSnapAlign: 'start' }}
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
