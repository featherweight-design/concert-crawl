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
    if (theme !== serverTheme) setTheme(serverTheme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
