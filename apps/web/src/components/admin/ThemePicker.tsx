'use client'

import { useState, useEffect } from 'react'
import { useAdminTheme } from '@/components/admin/shell/AdminThemeProvider'
import type { AdminTheme } from '@/components/admin/shell/AdminThemeProvider'
import { THEME_META, THEME_NAMES } from '@/theme/themes'
import { ThemeSwatch } from '@/theme/ThemeSwatch'

// Admin picker mirrors the consumer-facing `ThemePickerInline` (Theme
// header + grid/scroll swatches + tap-to-switch hint) so the two
// surfaces feel like the same product control — Hugh flagged the old
// three-dot admin picker as visibly out of date (#1086). The admin
// side keeps its own state via `useAdminTheme` rather than reaching
// through to the consumer theme provider: admin themes are stored in
// localStorage/context, don't roundtrip through `patchMe`, and never
// touch the signed-in user's saved consumer theme.
// Seed `isMobile` from `matchMedia` on the very first client render so a
// mobile viewport doesn't paint the desktop grid for a frame before the
// effect flips it — the picker sits near the top of Admin Settings and
// the mid-render layout shift was visible on 320–480px devices (Copilot
// round 2 on #1100). Wrapped in a `typeof window` guard so SSR doesn't
// blow up; server output stays as the desktop grid, and the client's
// first render lines up with the true viewport.
const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 480px)').matches
  })

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 480px)')
    setIsMobile(mql.matches)
    const handler = (evt: MediaQueryListEvent) => setIsMobile(evt.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isMobile
}

export function ThemePicker() {
  const { theme, setTheme } = useAdminTheme()
  const isMobile = useIsMobile()
  const activeMeta = THEME_META[theme]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header — matches ThemePickerInline: "Theme" + active name + hint. */}
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

      {/* Grid (desktop) or horizontal scroll (mobile) — same 480px breakpoint
          the consumer picker uses. `ThemeSwatch` renders each option as a
          toggle button (`aria-pressed`), so wrap in a labelled group instead
          of a `role="radiogroup"` — the ARIA radio pattern expects
          `role="radio"` + `aria-checked` on children and would confuse
          screen readers here. */}
      <div
        role="group"
        aria-label="Admin theme"
        style={
          isMobile
            ? {
                display: 'flex',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
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
        {THEME_NAMES.map((name: AdminTheme) =>
          isMobile ? (
            <div
              key={name}
              style={{ flex: '0 0 150px', scrollSnapAlign: 'start' }}
            >
              <ThemeSwatch
                name={name}
                active={theme === name}
                onClick={() => setTheme(name)}
              />
            </div>
          ) : (
            <ThemeSwatch
              key={name}
              name={name}
              active={theme === name}
              onClick={() => setTheme(name)}
            />
          ),
        )}
      </div>
    </div>
  )
}
