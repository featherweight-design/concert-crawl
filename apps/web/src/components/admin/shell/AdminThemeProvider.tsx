'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type AdminTheme = 'light' | 'dark' | 'electric' | 'jade'
export const VALID_THEMES: AdminTheme[] = ['light', 'dark', 'electric', 'jade']
const STORAGE_KEY = 'cc-admin-theme'

const ThemeContext = createContext<{
  theme: AdminTheme
  setTheme: (name: AdminTheme) => void
}>({ theme: 'light', setTheme: () => {} })

export const useAdminTheme = () => useContext(ThemeContext)

export const AdminThemeProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [theme, setThemeState] = useState<AdminTheme>('light')

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    const stored: AdminTheme | null = VALID_THEMES.includes(raw as AdminTheme)
      ? (raw as AdminTheme)
      : null
    setThemeState(stored ?? 'electric')
  }, [])

  const setTheme = (name: AdminTheme) => {
    setThemeState(name)
    localStorage.setItem(STORAGE_KEY, name)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div data-admin-theme={theme} style={{ display: 'contents' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}
