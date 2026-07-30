'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { THEME_NAMES, type ThemeName } from '@/theme/themes'
import { patchMe } from '@/lib/users'

// localStorage is a system boundary, so the stored value has to be proven a
// ThemeName rather than cast to one. apps/web carries no zod dependency, so
// this is the guard form of the same check.
const isThemeName = (value: unknown): value is ThemeName =>
  typeof value === 'string' && THEME_NAMES.some((name) => name === value)

export function OnboardingThemeFlush() {
  const { getToken, isSignedIn } = useAuth()

  useEffect(() => {
    // Onboarding is public now, so this can mount for a visitor who never
    // signed up. Guarding inside the effect (rather than early-returning from
    // the component) keeps the flush queued until sign-in lands.
    if (!isSignedIn) return

    const pending = localStorage.getItem('cc-onboarding-theme-pending')
    if (!pending) return

    void (async () => {
      try {
        const stored = localStorage.getItem('cc-theme')
        if (!isThemeName(stored)) {
          // Nothing valid to flush — clear so we don't retry forever
          localStorage.removeItem('cc-onboarding-theme-pending')
          return
        }
        const token = await getToken()
        if (!token) {
          localStorage.removeItem('cc-onboarding-theme-pending')
          return
        }
        await patchMe(token, { theme: stored })
        localStorage.removeItem('cc-onboarding-theme-pending')
      } catch (err) {
        // Network/API error — leave the flag set so the next protected-route load retries
        console.error('Failed to flush the onboarding theme', err)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn])

  return null
}
