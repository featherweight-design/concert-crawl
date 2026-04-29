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

  useEffect(() => {
    const stored = document.documentElement.getAttribute('data-theme')
    if (stored && isThemeName(stored)) {
      setThemeState(stored)
    }
  }, [])

  function setTheme(theme: ThemeName) {
    applyTheme(theme)
    localStorage.setItem('cc-theme', theme)
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
