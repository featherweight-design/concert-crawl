'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { fetchMe } from '@/lib/users'
import { isTabActive } from '@/lib/nav-tab-active'
import type { AvatarColor } from '@concert-crawl/types'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { AnonDisc } from '@/components/consumer/app-header/AnonDisc'
import { useAccountMenu } from '@/components/consumer/user-menu/account-menu-context'
import { NotifPip } from '@/components/consumer/notifications/NotifPip'

const COPY = CONSUMER_COPY.bottomNav
const MENU_LABELS = CONSUMER_COPY.userMenu.ariaLabels

const STATIC_TABS = [
  {
    key: COPY.nav.tabs[0].key,
    label: COPY.nav.tabs[0].label,
    href: COPY.nav.tabs[0].href,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <line
          x1="2"
          y1="4.5"
          x2="16"
          y2="4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="2"
          y1="9"
          x2="16"
          y2="9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="2"
          y1="13.5"
          x2="16"
          y2="13.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: COPY.nav.tabs[1].key,
    label: COPY.nav.tabs[1].label,
    href: COPY.nav.tabs[1].href,
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
    key: COPY.nav.tabs[2].key,
    label: COPY.nav.tabs[2].label,
    href: COPY.nav.tabs[2].href,
    matchPrefixes: COPY.nav.tabs[2].matchPrefixes,
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
        width: 28,
        height: 28,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: tintBg,
        color: `var(--${tone})`,
        fontSize: 12,
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
      data-testid="me-avatar-skeleton"
      style={{
        width: 28,
        height: 28,
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
  const {
    open: menuOpen,
    toggleFrom,
    unreadCount,
    hasUnseen,
  } = useAccountMenu()
  const menuTriggerRef = useRef<HTMLButtonElement>(null)

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
      if (!token || cancelled) {
        if (!cancelled) setProfileLoaded(true)
        return
      }
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
  // Signed-in only, and guarded here rather than trusting the provider alone —
  // an anonymous visitor must never see a pip on the account slot.
  //
  // UNSEEN draws the dot (it clears on panel open); UNREAD is still what the
  // accessible name announces, since that is what is waiting inside.
  const piped = isSignedIn === true && hasUnseen
  // Deliberately NOT `piped` — see the same split on the desktop trigger. The
  // dot is "something arrived"; the label is "something is still waiting".
  const announcesUnread = isSignedIn === true && unreadCount > 0

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-bg-elevated sm:hidden"
      style={{
        height: 'calc(52px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 2px)',
      }}
      aria-label={COPY.nav.ariaLabel}
    >
      {STATIC_TABS.map((tab) => {
        const isActive = isTabActive(tab, pathname)
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
      {/* Slot 4 opens the account menu in both auth states. Signed in it used to
          link straight to /me, which skipped past every other destination the
          menu holds; the menu is the nav affordance and Settings is one row in
          it. Signed out it's the same trigger, and an anonymous visitor lands on
          the resolved disc directly rather than transiting the skeleton. */}
      <button
        ref={menuTriggerRef}
        type="button"
        onClick={() => toggleFrom(menuTriggerRef.current)}
        aria-label={
          !isSignedIn
            ? MENU_LABELS.accountMenuSignedOut
            : announcesUnread
              ? MENU_LABELS.accountMenuUnread(unreadCount)
              : MENU_LABELS.accountMenu
        }
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        className="flex cursor-pointer flex-col items-center justify-center gap-[3px]"
        style={{
          width: 56,
          minHeight: 44,
          color:
            isSignedIn && isMeActive ? 'var(--signal)' : 'var(--fg-subtle)',
        }}
      >
        {/* The pip rides the glyph in EVERY branch — skeleton included. An
            avatar that is still loading is not a reason to swallow the one
            signal that says something happened. */}
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          {!isSignedIn ? (
            <AnonDisc size={26} />
          ) : !profileLoaded ? (
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
          {piped && (
            <NotifPip
              ring="var(--bg-elevated)"
              style={{ position: 'absolute', top: -2, right: -4 }}
            />
          )}
        </span>
      </button>
    </nav>
  )
}
