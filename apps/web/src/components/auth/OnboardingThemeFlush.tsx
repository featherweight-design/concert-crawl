'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { THEMES, type ThemeName } from '@/theme/themes'
import { patchMe } from '@/lib/users'

export function OnboardingThemeFlush() {
  const { getToken } = useAuth()

  useEffect(() => {
    const pending = localStorage.getItem('cc-onboarding-theme-pending')
    if (!pending) return

    void (async () => {
      try {
        const raw = localStorage.getItem('cc-theme')
        if (raw && Object.hasOwn(THEMES, raw)) {
          const token = await getToken()
          if (token) {
            await patchMe(token, { theme: raw as ThemeName })
          }
        }
      } catch (_err) {
        // Network errors are non-fatal; the pending flag is still cleared below
      } finally {
        localStorage.removeItem('cc-onboarding-theme-pending')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
