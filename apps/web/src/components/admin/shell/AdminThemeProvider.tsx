'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { PageTitleProvider } from './PageTitleContext'
import { type ThemeName, THEME_NAMES } from '@/theme/themes'

export type AdminTheme = ThemeName
export const VALID_THEMES = THEME_NAMES
const STORAGE_KEY = 'cc-admin-theme'

function isAdminTheme(value: string | null): value is AdminTheme {
  return value !== null && THEME_NAMES.some((name) => name === value)
}

const ThemeContext = createContext<{
  theme: AdminTheme
  setTheme: (name: AdminTheme) => void
}>({ theme: 'electric', setTheme: () => {} })

export const useAdminTheme = () => useContext(ThemeContext)

export const AdminThemeProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [theme, setThemeState] = useState<AdminTheme>('electric')

  useEffect(() => {
    const adminRaw = localStorage.getItem(STORAGE_KEY)
    if (isAdminTheme(adminRaw)) {
      setThemeState(adminRaw)
      return
    }
    const consumerRaw = localStorage.getItem('cc-theme')
    setThemeState(isAdminTheme(consumerRaw) ? consumerRaw : 'electric')
  }, [])

  const setTheme = (name: AdminTheme) => {
    setThemeState(name)
    localStorage.setItem(STORAGE_KEY, name)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <PageTitleProvider>
        <div data-admin-theme={theme} style={{ display: 'contents' }}>
          {children}
        </div>
      </PageTitleProvider>
    </ThemeContext.Provider>
  )
}
