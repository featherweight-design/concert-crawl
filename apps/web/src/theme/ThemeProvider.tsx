'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { applyTheme } from './apply-theme'
import { THEMES, type ThemeName } from './themes'

interface ThemeContextValue {
  theme: ThemeName
  setTheme: (t: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('electric')

  useEffect(() => {
    const stored = document.documentElement.getAttribute('data-theme')
    if (stored && stored in THEMES) {
      setThemeState(stored as ThemeName)
    }
  }, [])

  function setTheme(t: ThemeName) {
    applyTheme(t)
    localStorage.setItem('cc-theme', t)
    setThemeState(t)
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
