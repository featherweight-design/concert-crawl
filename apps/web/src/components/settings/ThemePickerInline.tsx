'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useTheme } from '@/theme/ThemeProvider'
import { THEMES, type ThemeName } from '@/theme/themes'
import { patchMe } from '@/lib/users'

const THEME_LABELS: Record<ThemeName, string> = {
  electric: 'Electric',
  jade: 'Jade',
  light: 'Light',
}

export function ThemePickerInline() {
  const { theme, setTheme } = useTheme()
  const { getToken } = useAuth()
  const [isSaving, setIsSaving] = useState(false)

  async function handleSelectTheme(name: ThemeName) {
    if (name === theme || isSaving) return
    setTheme(name)
    setIsSaving(true)
    try {
      const token = await getToken()
      if (token) {
        await patchMe(token, { theme: name })
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex gap-3">
      {(Object.keys(THEMES) as ThemeName[]).map((name) => {
        const tokens = THEMES[name]
        const isActive = theme === name
        return (
          <button
            key={name}
            type="button"
            aria-label={`${THEME_LABELS[name]} theme`}
            aria-pressed={isActive}
            onClick={() => void handleSelectTheme(name)}
            disabled={isSaving}
            className="flex flex-col items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:cursor-wait"
          >
            {/* Mini preview swatch */}
            <div
              className="flex h-10 w-10 items-center justify-center gap-1 rounded-xl transition-shadow"
              style={{
                background: tokens['bg'],
                boxShadow: isActive
                  ? `0 0 0 3px ${tokens['signal']}`
                  : `0 0 0 1px ${tokens['border']}`,
              }}
            >
              <span
                className="block h-2 w-2 rounded-full"
                style={{ background: tokens['signal'] }}
              />
              <span
                className="block h-2 w-2 rounded-full"
                style={{ background: tokens['accent'] }}
              />
            </div>

            {/* Label */}
            <span
              className="text-[11px] font-medium"
              style={{
                color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {THEME_LABELS[name]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
