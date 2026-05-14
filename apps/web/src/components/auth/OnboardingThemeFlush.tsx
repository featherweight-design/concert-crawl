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
        if (!raw || !Object.hasOwn(THEMES, raw)) {
          // Nothing valid to flush — clear so we don't retry forever
          localStorage.removeItem('cc-onboarding-theme-pending')
          return
        }
        const token = await getToken()
        if (!token) {
          localStorage.removeItem('cc-onboarding-theme-pending')
          return
        }
        await patchMe(token, { theme: raw as ThemeName })
        localStorage.removeItem('cc-onboarding-theme-pending')
      } catch (_err) {
        // Network/API error — leave the flag set so the next protected-route load retries
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
