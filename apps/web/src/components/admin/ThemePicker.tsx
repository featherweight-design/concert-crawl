'use client'

import { useAdminTheme } from '@/components/admin/shell/AdminThemeProvider'
import type { AdminTheme } from '@/components/admin/shell/AdminThemeProvider'

const ADMIN_THEMES: {
  id: AdminTheme
  label: string
  bg: string
  signal: string
  accent: string
}[] = [
  {
    id: 'light',
    label: 'Light',
    bg: '#f7f5f0',
    signal: '#1d5fbf',
    accent: '#7a3aa8',
  },
  {
    id: 'dark',
    label: 'Dark',
    bg: '#15140f',
    signal: '#7ab4ff',
    accent: '#c89bf0',
  },
  {
    id: 'electric',
    label: 'Electric',
    bg: '#070A1A',
    signal: '#7AE6FF',
    accent: '#FF7BD4',
  },
  {
    id: 'jade',
    label: 'Jade',
    bg: '#06201F',
    signal: '#1FFFC2',
    accent: '#9B5CFF',
  },
]

export function ThemePicker() {
  const { theme, setTheme } = useAdminTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Admin theme"
      style={{ display: 'flex', gap: 12 }}
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
