'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { fetchMe } from '@/lib/users'
import type { AvatarColor } from '@concert-crawl/types'

const COLOR_VAR: Record<AvatarColor, string> = {
  signal: 'var(--signal)',
  accent: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
}

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
    key: 'search',
    label: 'search',
    href: '/search',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12.5 12.5L16 16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: 'saved',
    label: 'saved',
    href: '/watching',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M9 15l-6.5-6A3.5 3.5 0 019 4.5 3.5 3.5 0 0115.5 9L9 15z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
] as const

interface MeAvatarProps {
  handle: string | null
  avatarColor: AvatarColor | null
  isActive: boolean
}

function MeAvatar({ handle, avatarColor, isActive }: MeAvatarProps) {
  const letter = handle ? handle.charAt(0).toUpperCase() : '?'
  const bgColor = avatarColor ? COLOR_VAR[avatarColor] : 'var(--signal)'
  const ringColor = avatarColor ? COLOR_VAR[avatarColor] : 'var(--signal)'

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
        background: bgColor,
        color: 'var(--bg)',
        fontSize: 10,
        fontWeight: 800,
        fontFamily: 'var(--font-ui)',
        userSelect: 'none',
        outline: isActive ? `2px solid ${ringColor}` : 'none',
        outlineOffset: 2,
      }}
    >
      {letter}
    </div>
  )
}

export function BottomNav() {
  const pathname = usePathname()
  const { getToken, isSignedIn } = useAuth()
  const [avatarHandle, setAvatarHandle] = useState<string | null>(null)
  const [avatarColor, setAvatarColor] = useState<AvatarColor | null>(null)

  useEffect(() => {
    if (!isSignedIn) return
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
        className="flex flex-col items-center gap-[3px]"
        style={{ color: isMeActive ? 'var(--signal)' : 'var(--fg-subtle)' }}
      >
        <MeAvatar
          handle={avatarHandle}
          avatarColor={avatarColor}
          isActive={isMeActive}
        />
        <span
          className="text-[9px] tracking-[0.04em]"
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: isMeActive ? 700 : 500,
          }}
        >
          me
        </span>
      </Link>
    </nav>
  )
}
