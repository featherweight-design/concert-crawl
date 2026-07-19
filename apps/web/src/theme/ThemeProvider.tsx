'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { applyTheme } from './apply-theme'
import { THEMES, type ThemeName } from './themes'

interface ThemeContextValue {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function isThemeName(value: string): value is ThemeName {
  return Object.hasOwn(THEMES, value)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof document === 'undefined') return 'electric'
    const stored = document.documentElement.getAttribute('data-theme')
    return stored && isThemeName(stored) ? stored : 'electric'
  })

  // Re-assert the persisted theme after mount. React 19's hydration-mismatch
  // recovery treats <html> as a singleton and cleans attributes it didn't
  // render — wiping the inline no-flash script's style tokens and data-theme
  // (seen after Clerk reverification reloads). localStorage is the persisted
  // source of truth (the inline script derives data-theme from it), so it
  // wins over a divergent attribute; applyTheme re-sets the same tokens the
  // inline script wrote, so it is effectively idempotent on a DOM that is
  // already correct.
  useEffect(() => {
    let persisted: string | null = null
    try {
      persisted = localStorage.getItem('cc-theme')
    } catch (err) {
      // Storage unavailable (private mode, blocked, or disabled) — fall back
      // to the DOM attribute.
      console.warn('theme: localStorage unavailable on mount', err)
    }
    const attr = document.documentElement.getAttribute('data-theme')
    const resolved =
      persisted && isThemeName(persisted)
        ? persisted
        : attr && isThemeName(attr)
          ? attr
          : theme
    applyTheme(resolved)
    setThemeState(resolved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setTheme(theme: ThemeName) {
    applyTheme(theme)
    try {
      localStorage.setItem('cc-theme', theme)
    } catch (err) {
      // Storage unavailable (private mode, blocked, or disabled) — the theme
      // still applies for this visit, it just won't persist.
      console.warn('theme: could not persist theme choice', err)
    }
    setThemeState(theme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
