'use client'

import { cn } from '@/lib/utils'
import { THEME_NAMES, type ThemeName } from '@/theme/themes'
import { useTheme } from '@/theme'

const THEME_ICONS: Record<ThemeName, string> = {
  electric: '⚡',
  jade: '◈',
  light: '○',
}

const THEME_LABELS: Record<ThemeName, string> = {
  electric: 'Electric',
  jade: 'Jade',
  light: 'Light',
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-1 p-0.5"
    >
      {THEME_NAMES.map((name) => {
        const isSelected = theme === name
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={THEME_LABELS[name]}
            title={THEME_LABELS[name]}
            onClick={() => setTheme(name)}
            className={cn(
              'h-6 w-6 rounded-md text-xs transition-all',
              isSelected
                ? 'bg-surface-3 text-fg'
                : 'text-fg-subtle hover:text-fg-muted',
            )}
          >
            {THEME_ICONS[name]}
          </button>
        )
      })}
    </div>
  )
}
