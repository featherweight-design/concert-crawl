'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { fetchMe } from '@/lib/users'
import { ProfileEntryAvatar } from '@/components/settings/ProfileEntryAvatar'
import type { UserProfileResponse } from '@concert-crawl/types'
import { copy } from './definitions/copy'

export function MobileProfileEntry() {
  const { getToken, isSignedIn } = useAuth()
  const [profile, setProfile] = useState<UserProfileResponse | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    if (!isSignedIn) {
      setProfile(null)
      setProfileLoaded(false)
      return
    }
    let cancelled = false
    setProfileLoaded(false)
    void (async () => {
      const token = await getToken()
      if (!token || cancelled) {
        if (!cancelled) setProfileLoaded(true)
        return
      }
      try {
        const data = await fetchMe(token)
        if (!cancelled) setProfile(data)
      } catch (err) {
        console.warn(copy.mobileProfileEntry.loadErrorLog, err)
      } finally {
        if (!cancelled) setProfileLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getToken, isSignedIn])

  if (!isSignedIn) return null

  return (
    <ProfileEntryAvatar
      handle={profile?.handle ?? null}
      avatarColor={profile?.avatarColor ?? null}
      loading={!profileLoaded}
    />
  )
}
