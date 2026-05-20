'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { fetchMe } from '@/lib/users'
import { ProfileEntryAvatar } from '@/components/settings/ProfileEntryAvatar'
import type { UserProfileResponse } from '@concert-crawl/types'

export function MobileProfileEntry() {
  const { getToken, isSignedIn } = useAuth()
  const [profile, setProfile] = useState<UserProfileResponse | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    void (async () => {
      const token = await getToken()
      if (!token) {
        setProfileLoaded(true)
        return
      }
      try {
        const data = await fetchMe(token)
        setProfile(data)
      } catch (err) {
        console.warn(
          'MobileProfileEntry: could not load profile, showing anonymous avatar',
          err,
        )
      } finally {
        setProfileLoaded(true)
      }
    })()
  }, [getToken])

  if (!isSignedIn) return null

  return (
    <ProfileEntryAvatar
      handle={profile?.handle ?? null}
      avatarColor={profile?.avatarColor ?? null}
      loading={!profileLoaded}
    />
  )
}
