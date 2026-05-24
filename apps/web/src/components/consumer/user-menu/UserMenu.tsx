'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth, useUser, useClerk } from '@clerk/nextjs'
import { Avatar } from '@/components/settings/Avatar'
import { ThemeSwatch } from '@/theme/ThemeSwatch'
import { THEMES, THEME_META, THEME_NAMES } from '@/theme/themes'
import { MiniMark } from '@/theme/MiniMark'
import { useTheme } from '@/theme'
import { fetchMe } from '@/lib/users'
import type { AvatarColor } from '@concert-crawl/types'
import { UserMenuVersionFooter } from '@/components/consumer/release-notes/UserMenuVersionFooter'

const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'dev'

export function UserMenu() {
  const { getToken, sessionClaims } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [submissionCount, setSubmissionCount] = useState(0)
  const [avatarHandle, setAvatarHandle] = useState<string | null>(null)
  const [avatarColor, setAvatarColor] = useState<AvatarColor | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)')
    setIsMobile(mql.matches)
    const handler = (ev: MediaQueryListEvent) => setIsMobile(ev.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // Close on click-outside (only registered when open)
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (ev: MouseEvent) => {
      const target = ev.target
      if (
        target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const token = await getToken()
      if (!token || cancelled) return
      try {
        const profile = await fetchMe(token)
        if (!cancelled) {
          setAvatarHandle(profile.handle)
          setAvatarColor(profile.avatarColor)
          setSubmissionCount(profile.submissionCount)
        }
      } catch (err) {
        console.warn('UserMenu: could not load profile', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getToken])

  const handleSignOut = useCallback(() => {
    void signOut().catch((err: unknown) =>
      console.error('Sign out failed', err),
    )
  }, [signOut])

  // Derive user display values
  const email = user?.emailAddresses[0]?.emailAddress ?? ''

  // CustomJwtSessionClaims is augmented in apps/web/src/types/clerk.d.ts — no cast needed
  const isAdmin = sessionClaims?.metadata?.role === 'admin'

  // Build version display: "v0.4.2-beta · abc1234" or just "dev"
  const buildParts = APP_VERSION.split(' · ')
  const buildLabel = buildParts[0] ?? APP_VERSION

  return (
    <>
      <div ref={containerRef} className="relative">
        {/* Avatar trigger */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Account menu"
          aria-expanded={open}
          aria-haspopup="true"
          className="shrink-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]"
        >
          <Avatar handle={avatarHandle} avatarColor={avatarColor} size={36} />
        </button>

        {/* Desktop popover */}
        {open && !isMobile && (
          <UserMenuPopover
            email={email}
            isAdmin={isAdmin}
            buildLabel={buildLabel}
            submissionCount={submissionCount}
            avatarHandle={avatarHandle}
            avatarColor={avatarColor}
            onSettings={() => {
              setOpen(false)
              void router.push('/me')
            }}
            onSignOut={handleSignOut}
          />
        )}
      </div>

      {/* Mobile sheet rendered outside container so it's not clipped */}
      {open && isMobile && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 90,
              background: 'var(--scrim)',
            }}
            onClick={() => setOpen(false)}
          />
          <UserMenuSheet
            email={email}
            isAdmin={isAdmin}
            buildLabel={buildLabel}
            submissionCount={submissionCount}
            avatarHandle={avatarHandle}
            avatarColor={avatarColor}
            onSettings={() => {
              setOpen(false)
              void router.push('/me')
            }}
            onSignOut={handleSignOut}
          />
        </>
      )}
    </>
  )
}

// ── Shared props ──────────────────────────────────────────────────────────

interface MenuBodyProps {
  email: string
  isAdmin: boolean
  buildLabel: string
  onSettings: () => void
  onSignOut: () => void
  submissionCount: number
  avatarHandle: string | null
  avatarColor: AvatarColor | null
}

// ── Theme row with inline swatch grid ────────────────────────────────────

function ThemeMenuRow() {
  const { theme, setTheme } = useTheme()
  const [pickerOpen, setPickerOpen] = useState(false)
  const activeTokens = THEMES[theme]
  const activeMeta = THEME_META[theme]

  return (
    <>
      <button
        type="button"
        aria-expanded={pickerOpen}
        onClick={() => setPickerOpen((prev) => !prev)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          borderBottom: pickerOpen ? 'none' : '1px solid var(--border)',
          width: '100%',
          boxSizing: 'border-box',
          transition: 'background 120ms',
        }}
        className="bg-transparent hover:bg-[var(--overlay-hover)]"
      >
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--font-ui)',
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--fg)',
            letterSpacing: '-0.005em',
          }}
        >
          Theme
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <MiniMark tokens={activeTokens} size={18} />
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--fg-muted)',
              letterSpacing: '-0.005em',
            }}
          >
            {activeMeta.label}
          </span>
          <ChevronIcon open={pickerOpen} />
        </span>
      </button>

      {pickerOpen && (
        <div
          style={{
            padding: '10px 14px 12px',
            borderBottom: '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          {THEME_NAMES.map((name) => (
            <ThemeSwatch
              key={name}
              name={name}
              active={theme === name}
              onClick={() => {
                setTheme(name)
                setPickerOpen(false)
              }}
            />
          ))}
        </div>
      )}
    </>
  )
}

// ── Menu body (shared between popover and sheet) ──────────────────────────

function MenuBody({
  email,
  isAdmin,
  buildLabel,
  onSettings,
  onSignOut,
  submissionCount,
  avatarHandle,
  avatarColor,
}: MenuBodyProps) {
  return (
    <>
      {/* Identity card */}
      <div
        style={{
          padding: '14px 14px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Avatar handle={avatarHandle} avatarColor={avatarColor} size={42} />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Beta · founder
          </span>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--fg)',
              letterSpacing: '-0.005em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {email}
          </span>
        </div>
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg-muted)',
            border: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 4.5l3 3 3-3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {/* You section */}
      <SectionLabel>You</SectionLabel>
      <MenuRow
        label="Submitted prices"
        href="/me?section=submissions"
        {...(submissionCount > 0 ? { meta: `${submissionCount} live` } : {})}
        kbd="P"
        last
      />

      {/* App section */}
      <SectionLabel>App</SectionLabel>
      <ThemeMenuRow />
      <MenuRow label="Settings" onClick={onSettings} last />

      {/* Admin section */}
      {isAdmin && (
        <>
          <SectionLabel>Operations</SectionLabel>
          <MenuRow
            label="Admin"
            href="/admin"
            last
            leading={
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: 'var(--surface-2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--signal)',
                  flexShrink: 0,
                }}
              >
                <ShieldIcon />
              </span>
            }
          />
        </>
      )}

      {/* Sign out */}
      <div style={{ borderTop: '1px solid var(--border)' }} />
      <MenuRow label="Sign out" danger last onClick={onSignOut} />

      {/* Status footer — routes to /changelog, shows unread dot */}
      <UserMenuVersionFooter build={buildLabel} />
    </>
  )
}

// ── Popover (desktop) ─────────────────────────────────────────────────────

function UserMenuPopover(props: MenuBodyProps) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 'calc(100% + 8px)',
        zIndex: 100,
        width: 360,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 14,
        boxShadow: '0 24px 64px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        fontFamily: 'var(--font-ui)',
        color: 'var(--fg)',
      }}
    >
      <MenuBody {...props} />
    </div>
  )
}

// ── Bottom sheet (mobile) ─────────────────────────────────────────────────

function UserMenuSheet(props: MenuBodyProps) {
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        background: 'var(--bg-elevated)',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        border: '1px solid var(--border)',
        borderBottom: 'none',
        boxShadow: '0 -16px 48px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        fontFamily: 'var(--font-ui)',
        color: 'var(--fg)',
      }}
    >
      {/* Drag handle */}
      <div
        style={{
          height: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'var(--border-strong)',
          }}
        />
      </div>
      <MenuBody {...props} />
    </div>
  )
}

// ── Primitives ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '10px 14px 4px',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--fg-subtle)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  )
}

interface MenuRowProps {
  label: string
  meta?: string
  kbd?: string
  hot?: boolean
  danger?: boolean
  last?: boolean
  leading?: React.ReactNode
  trailing?: React.ReactNode
  href?: string
  onClick?: () => void
}

function MenuRow({
  label,
  meta,
  kbd,
  hot = false,
  danger = false,
  last = false,
  leading,
  trailing,
  href,
  onClick,
}: MenuRowProps) {
  const color = danger ? 'var(--warning)' : 'var(--fg)'
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderBottom: last ? 'none' : '1px solid var(--border)',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
    textDecoration: 'none',
    textAlign: 'left',
    color,
  }
  const rowClass = hot
    ? 'bg-[var(--overlay-hover)]'
    : 'bg-transparent transition-colors hover:bg-[var(--overlay-hover)]'

  const inner = (
    <>
      {hot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 6,
            background: 'var(--accent)',
            boxShadow: '0 0 6px var(--accent)',
            animation: 'umPulse 1.6s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
      )}
      {leading}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: 'var(--font-ui)',
          fontSize: 13.5,
          fontWeight: hot ? 800 : 600,
          color,
          letterSpacing: '-0.005em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      {trailing}
      {meta != null && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: hot ? 'var(--accent)' : 'var(--fg-subtle)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          {meta}
        </span>
      )}
      {kbd && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--fg-subtle)',
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
            letterSpacing: '0.08em',
          }}
        >
          {kbd}
        </span>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} style={rowStyle} className={rowClass}>
        {inner}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={rowStyle}
        className={rowClass}
      >
        {inner}
      </button>
    )
  }
  return (
    <div style={rowStyle} className={rowClass}>
      {inner}
    </div>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      style={{
        color: 'var(--fg-muted)',
        transition: 'transform 150ms ease',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        flexShrink: 0,
      }}
    >
      <path
        d="M4.5 3l3 3-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1.5l5.5 2v4.2c0 3.4-2.4 6.4-5.5 7.3-3.1-0.9-5.5-3.9-5.5-7.3V3.5L8 1.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 8.2l1.8 1.8L10.5 7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
