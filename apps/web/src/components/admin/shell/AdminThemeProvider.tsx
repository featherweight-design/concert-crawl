'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type AdminTheme = 'light' | 'dark'
const STORAGE_KEY = 'cc-admin-theme'

const ThemeContext = createContext<{
  theme: AdminTheme
  toggle: () => void
  setTheme: (theme: AdminTheme) => void
}>({ theme: 'light', toggle: () => {}, setTheme: () => {} })

export const useAdminTheme = () => useContext(ThemeContext)

export const AdminThemeProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [theme, setThemeState] = useState<AdminTheme>('light')

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    const stored: AdminTheme | null =
      raw === 'light' || raw === 'dark' ? raw : null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    setThemeState(stored ?? preferred)
  }, [])

  const toggle = () => {
    setThemeState((prev) => {
      const next: AdminTheme = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }

  const setTheme = (newTheme: AdminTheme) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
    document.documentElement.setAttribute('data-admin-theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      <div data-admin-theme={theme} style={{ display: 'contents' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}
