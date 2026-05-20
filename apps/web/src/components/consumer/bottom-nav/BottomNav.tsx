'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { fetchMe } from '@/lib/users'
import type { AvatarColor } from '@concert-crawl/types'

const STATIC_TABS = [
  {
    key: 'browse',
    label: 'browse',
    href: '/events',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <rect
          x="1"
          y="1"
          width="7"
          height="7"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="10"
          y="1"
          width="7"
          height="7"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="1"
          y="10"
          width="7"
          height="7"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="10"
          y="10"
          width="7"
          height="7"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    key: 'venues',
    label: 'venues',
    href: '/venues',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M9 1.5C6.515 1.5 4.5 3.515 4.5 6c0 3.375 4.5 10.5 4.5 10.5S13.5 9.375 13.5 6c0-2.485-2.015-4.5-4.5-4.5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    key: 'watching',
    label: 'watching',
    href: '/watching',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M1 9C1 9 4 3 9 3s8 6 8 6-3 6-8 6-8-6-8-6z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
] as const

interface MeAvatarProps {
  handle: string
  avatarColor: AvatarColor | null
  isActive: boolean
}

function MeAvatar({ handle, avatarColor, isActive }: MeAvatarProps) {
  const letter = handle.charAt(0).toUpperCase()
  const tone = avatarColor ?? 'signal'
  const tintBg = `color-mix(in oklch, var(--${tone}) 22%, var(--surface-1))`
  const tintBorder = `color-mix(in oklch, var(--${tone}) 50%, transparent)`

  return (
    <div
      aria-hidden="true"
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: tintBg,
        color: `var(--${tone})`,
        fontSize: 10,
        fontWeight: 800,
        fontFamily: 'var(--font-ui)',
        userSelect: 'none',
        outline: isActive ? `2px solid ${tintBorder}` : 'none',
        outlineOffset: 2,
      }}
    >
      {letter}
    </div>
  )
}

function MeAvatarSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        flexShrink: 0,
        background: 'var(--surface-2)',
      }}
    />
  )
}

function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 16c0-3.314 2.686-5 6-5s6 1.686 6 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function BottomNav() {
  const pathname = usePathname()
  const { getToken, isSignedIn } = useAuth()
  const [avatarHandle, setAvatarHandle] = useState<string | null>(null)
  const [avatarColor, setAvatarColor] = useState<AvatarColor | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    if (!isSignedIn) {
      setAvatarHandle(null)
      setAvatarColor(null)
      setProfileLoaded(true)
      return
    }
    let cancelled = false
    void (async () => {
      const token = await getToken()
      if (!token || cancelled) return
      try {
        const profile = await fetchMe(token)
        if (!cancelled) {
          setAvatarHandle(profile.handle)
          setAvatarColor(profile.avatarColor)
        }
      } catch (err) {
        console.warn('BottomNav: could not load profile', err)
      } finally {
        if (!cancelled) setProfileLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getToken, isSignedIn])

  const isMeActive = pathname.startsWith('/me')

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-[52px] items-center justify-around border-t border-border bg-bg-elevated pb-0.5 sm:hidden"
      aria-label="Main navigation"
    >
      {STATIC_TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className="flex flex-col items-center gap-[3px]"
            style={{ color: isActive ? 'var(--signal)' : 'var(--fg-subtle)' }}
          >
            {tab.icon}
            <span
              className="text-[9px] tracking-[0.04em]"
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
      <Link
        href="/me"
        aria-label="Profile"
        className="flex flex-col items-center gap-[3px]"
        style={{ color: isMeActive ? 'var(--signal)' : 'var(--fg-subtle)' }}
      >
        {!profileLoaded ? (
          <MeAvatarSkeleton />
        ) : avatarHandle !== null ? (
          <MeAvatar
            handle={avatarHandle}
            avatarColor={avatarColor}
            isActive={isMeActive}
          />
        ) : (
          <PersonIcon />
        )}
      </Link>
    </nav>
  )
}
