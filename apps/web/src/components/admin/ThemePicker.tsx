'use client'

import { useAdminTheme } from '@/components/admin/shell/AdminThemeProvider'
import type { AdminTheme } from '@/components/admin/shell/AdminThemeProvider'
import { THEME_META, THEME_NAMES, THEMES } from '@/theme/themes'

const ADMIN_THEMES = THEME_NAMES.map((id) => ({
  id,
  label: THEME_META[id].label,
  bg: THEMES[id]['bg'] ?? '',
  signal: THEMES[id]['signal'] ?? '',
  accent: THEMES[id]['accent'] ?? '',
})) satisfies {
  id: AdminTheme
  label: string
  bg: string
  signal: string
  accent: string
}[]

export function ThemePicker() {
  const { theme, setTheme } = useAdminTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Admin theme"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}
    >
      {ADMIN_THEMES.map((themeOption) => {
        const isSelected = theme === themeOption.id
        return (
          <button
            key={themeOption.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => setTheme(themeOption.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              borderRadius: 12,
              padding: 16,
              border: isSelected
                ? '2px solid var(--signal)'
                : '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              cursor: 'pointer',
              outline: isSelected ? '2px solid var(--signal)' : 'none',
              outlineOffset: 2,
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: themeOption.bg,
                  border: '1px solid rgba(0,0,0,0.15)',
                }}
              />
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: themeOption.signal,
                }}
              />
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: themeOption.accent,
                }}
              />
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>
              {themeOption.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
