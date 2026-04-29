// apps/web/src/components/admin/ThemePicker.tsx
'use client'

import { cn } from '@/lib/utils'
import { THEMES, THEME_NAMES, type ThemeName } from '@/theme/themes'
import { useTheme } from '@/theme'

const THEME_LABELS: Record<ThemeName, string> = {
  electric: 'Electric',
  jade: 'Jade',
  light: 'Light',
}

export function ThemePicker() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex flex-wrap gap-3">
      {THEME_NAMES.map((name) => {
        const tokens = THEMES[name]
        const isSelected = theme === name

        return (
          <button
            key={name}
            type="button"
            onClick={() => setTheme(name)}
            className={cn(
              'flex flex-col gap-3 rounded-xl border p-4 text-left transition-all',
              isSelected
                ? 'border-border-focus ring-2 ring-border-focus'
                : 'border-border hover:border-border-strong',
            )}
          >
            <div className="flex gap-1.5">
              <span
                className="size-4 rounded-full ring-1 ring-black/10"
                style={{ background: tokens.bg }}
              />
              <span
                className="size-4 rounded-full"
                style={{ background: tokens.signal }}
              />
              <span
                className="size-4 rounded-full"
                style={{ background: tokens.accent }}
              />
            </div>
            <span className="text-sm font-medium text-fg">
              {THEME_LABELS[name]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
