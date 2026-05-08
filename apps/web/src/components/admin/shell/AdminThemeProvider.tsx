'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type AdminTheme = 'light' | 'dark'
const STORAGE_KEY = 'cc-admin-theme'

const ThemeContext = createContext<{
  theme: AdminTheme
  toggle: () => void
}>({ theme: 'light', toggle: () => {} })

export const useAdminTheme = () => useContext(ThemeContext)

export const AdminThemeProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [theme, setTheme] = useState<AdminTheme>('light')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AdminTheme | null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    setTheme(stored ?? preferred)
  }, [])

  const toggle = () => {
    setTheme((prev) => {
      const next: AdminTheme = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <div data-admin-theme={theme} style={{ display: 'contents' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}
