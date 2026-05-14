'use client'

import { useEffect } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import type { UserTheme } from '@concert-crawl/types'

interface ThemeSyncProps {
  serverTheme: UserTheme
}

export function ThemeSync({ serverTheme }: ThemeSyncProps) {
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    // Defer to OnboardingThemeFlush while a pending onboarding theme exists;
    // syncing the stale server value here would overwrite the local selection.
    if (localStorage.getItem('cc-onboarding-theme-pending')) return
    if (theme !== serverTheme) setTheme(serverTheme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
