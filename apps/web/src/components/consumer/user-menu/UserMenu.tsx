'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth, useUser, useClerk } from '@clerk/nextjs'
import { useTheme } from '@/theme/ThemeProvider'
import { THEMES, THEME_META, type ThemeName } from '@/theme/themes'
import { FeedbackModal } from '../feedback/FeedbackModal'

const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'dev'
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? ''

export function UserMenu() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [submissionCount, setSubmissionCount] = useState(0)
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
    getToken()
      .then((token) => {
        if (!token || cancelled) return
        return fetch(`${API_URL}/v1/users/me/submissions/count`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      })
      .then((res) => {
        if (!res || cancelled) return res?.json()
        return res.json()
      })
      .then((body: unknown) => {
        if (cancelled) return
        if (
          body !== null &&
          typeof body === 'object' &&
          'data' in body &&
          body.data !== null &&
          typeof body.data === 'object' &&
          'count' in body.data &&
          typeof (body.data as Record<string, unknown>).count === 'number'
        ) {
          setSubmissionCount(
            (body.data as Record<string, unknown>).count as number,
          )
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to fetch submission count', err)
      })
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
  const firstName = user?.firstName ?? ''
  const lastName = user?.lastName ?? ''
  const initials =
    firstName || lastName
      ? (firstName.charAt(0) + lastName.charAt(0)).toUpperCase()
      : (user?.emailAddresses[0]?.emailAddress.charAt(0) ?? '?').toUpperCase()
  const email = user?.emailAddresses[0]?.emailAddress ?? ''

  // UserPublicMetadata is augmented in apps/web/src/types/clerk.d.ts — no cast needed
  const isAdmin = user?.publicMetadata?.role === 'admin'

  // Build version display: "v0.4.2-beta · abc1234" or just "dev"
  const buildParts = APP_VERSION.split(' · ')
  const buildLabel = buildParts[0] ?? APP_VERSION
  const commitLabel = buildParts[1] ?? ''

  return (
    <>
      <div ref={containerRef} className="relative">
        {/* Avatar trigger */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Account menu"
          aria-expanded={open}
          aria-haspopup="menu"
          className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full border border-[var(--border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]"
          style={{ background: 'var(--surface-1)' }}
        >
          <span
            className="flex h-full w-full items-center justify-center text-[13px] font-bold"
            style={{ color: 'var(--fg-muted)' }}
          >
            {initials}
          </span>
        </button>

        {/* Desktop popover */}
        {open && !isMobile && (
          <UserMenuPopover
            initials={initials}
            email={email}
            isAdmin={isAdmin}
            theme={theme}
            setTheme={setTheme}
            buildLabel={buildLabel}
            commitLabel={commitLabel}
            submissionCount={submissionCount}
            onFeedback={() => {
              setOpen(false)
              setFeedbackOpen(true)
            }}
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
            initials={initials}
            email={email}
            isAdmin={isAdmin}
            theme={theme}
            setTheme={setTheme}
            buildLabel={buildLabel}
            commitLabel={commitLabel}
            submissionCount={submissionCount}
            onFeedback={() => {
              setOpen(false)
              setFeedbackOpen(true)
            }}
            onSettings={() => {
              setOpen(false)
              void router.push('/me')
            }}
            onSignOut={handleSignOut}
          />
        </>
      )}

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </>
  )
}

// ── Shared props ──────────────────────────────────────────────────────────

interface MenuBodyProps {
  initials: string
  email: string
  isAdmin: boolean
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  buildLabel: string
  commitLabel: string
  onFeedback: () => void
  onSettings: () => void
  onSignOut: () => void
  submissionCount: number
}

// ── Menu body (shared between popover and sheet) ──────────────────────────

function MenuBody({
  initials,
  email,
  isAdmin,
  theme,
  setTheme,
  buildLabel,
  commitLabel,
  onFeedback,
  onSettings,
  onSignOut,
  submissionCount,
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
        <div
          style={{
            position: 'relative',
            width: 42,
            height: 42,
            borderRadius: 21,
            background: 'var(--surface-2)',
            border: '1px solid var(--border-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-ui)',
            fontWeight: 800,
            fontSize: 17,
            color: 'var(--fg)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              inset: -2,
              borderRadius: 23,
              background:
                'radial-gradient(circle at 30% 30%, var(--accent) 0%, transparent 70%)',
              opacity: 0.35,
              pointerEvents: 'none',
            }}
          />
          <span style={{ position: 'relative' }}>{initials}</span>
        </div>
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
        href="/me/submissions"
        {...(submissionCount > 0 ? { meta: `${submissionCount} live` } : {})}
        kbd="P"
        last
      />

      {/* App section */}
      <SectionLabel>App</SectionLabel>
      <ThemeMenuRow theme={theme} setTheme={setTheme} />
      <MenuRow label="Settings" onClick={onSettings} kbd="⌘," />
      <MenuRow label="Notifications" meta="On" last />

      {/* Admin section */}
      {isAdmin && (
        <>
          <SectionLabel>Operations</SectionLabel>
          <MenuRow
            label="Admin"
            href="/admin"
            meta="⌘⇧A"
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

      {/* Beta channel */}
      <SectionLabel>Beta channel</SectionLabel>
      <MenuRow
        label="Send feedback"
        meta="BETA"
        hot
        last
        onClick={onFeedback}
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
              color: 'var(--accent)',
              flexShrink: 0,
            }}
          >
            <ChatIcon />
          </span>
        }
      />

      {/* Sign out */}
      <div style={{ borderTop: '1px solid var(--border)' }} />
      <MenuRow label="Sign out" danger last onClick={onSignOut} />

      {/* Status footer */}
      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface-1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: 5,
            background: 'var(--signal)',
            boxShadow: '0 0 5px var(--signal)',
            animation: 'umPulse 2.2s ease-in-out infinite',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--fg-muted)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          {buildLabel}
        </span>
        <span style={{ flex: 1 }} />
        {commitLabel && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.08em',
            }}
          >
            {commitLabel}
          </span>
        )}
      </div>
    </>
  )
}

// ── Popover (desktop) ─────────────────────────────────────────────────────

function UserMenuPopover(props: MenuBodyProps) {
  return (
    <div
      role="menu"
      aria-label="Account menu"
      style={{
        position: 'absolute',
        right: 0,
        top: 'calc(100% + 8px)',
        zIndex: 100,
        width: 280,
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
      role="menu"
      aria-label="Account menu"
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

// ── Theme row + compact swatch ────────────────────────────────────────────

function UserMenuMiniMark({
  tokens,
  size = 18,
}: {
  tokens: Record<string, string>
  size?: number
}) {
  const dotPositions: [number, number][] = [
    [14, 38],
    [18, 34],
    [22, 30],
    [26, 26],
    [30, 22],
    [34, 18],
    [14, 32],
  ]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect width="48" height="48" rx="10" fill={tokens['surface-2']} />
      <circle cx="34" cy="14" r="9" fill={tokens['accent']} opacity="0.22" />
      <circle cx="34" cy="14" r="5" fill={tokens['accent-2']} opacity="0.45" />
      <circle cx="34" cy="14" r="3" fill={tokens['signal']} />
      {dotPositions.map(([cx, cy], idx) => (
        <circle
          key={idx}
          cx={cx}
          cy={cy}
          r="1.6"
          fill={tokens['fg']}
          opacity={0.45 + idx * 0.07}
        />
      ))}
    </svg>
  )
}

function CompactThemeSwatch({
  name,
  active,
  onClick,
}: {
  name: ThemeName
  active: boolean
  onClick: () => void
}) {
  const tokens = THEMES[name]
  const meta = THEME_META[name]
  return (
    <button
      type="button"
      aria-label={`${meta.label} theme`}
      aria-pressed={active}
      onClick={onClick}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 10,
        padding: '7px 6px',
        background: tokens['bg'],
        border: active
          ? `1.5px solid ${tokens['signal']}`
          : `1px solid ${tokens['border-strong']}`,
        transition: 'transform 100ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <UserMenuMiniMark tokens={tokens} size={16} />
        <span style={{ display: 'flex', gap: 2 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: tokens['signal'],
              display: 'block',
            }}
          />
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: tokens['accent'],
              display: 'block',
            }}
          />
        </span>
      </div>
      <span
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 9,
          fontWeight: 700,
          color: tokens['fg'],
          letterSpacing: '-0.005em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {meta.label}
      </span>
    </button>
  )
}

function ThemeMenuRow({
  theme,
  setTheme,
}: {
  theme: ThemeName
  setTheme: (name: ThemeName) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const activeTokens = THEMES[theme]
  const activeMeta = THEME_META[theme]
  const themeKeys = Object.keys(THEMES) as ThemeName[]

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          background: expanded ? 'var(--overlay-hover)' : 'transparent',
        }}
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
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <UserMenuMiniMark tokens={activeTokens} size={18} />
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--fg)',
              letterSpacing: '-0.005em',
            }}
          >
            {activeMeta.label}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--fg-muted)',
            }}
          >
            {expanded ? '▾' : '›'}
          </span>
        </span>
      </button>

      {expanded && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 6,
            padding: '6px 14px 12px',
          }}
        >
          {themeKeys.map((name) => (
            <CompactThemeSwatch
              key={name}
              name={name}
              active={theme === name}
              onClick={() => {
                setTheme(name)
                setExpanded(false)
              }}
            />
          ))}
        </div>
      )}
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
    background: hot ? 'var(--overlay-hover)' : 'transparent',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
    textDecoration: 'none',
    color,
  }

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
      <Link href={href} style={rowStyle}>
        {inner}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={rowStyle}>
        {inner}
      </button>
    )
  }
  return <div style={rowStyle}>{inner}</div>
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

function ChatIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 4h12v7H6.5L4 13.5V11H2V4z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="7.5" r="0.8" fill="currentColor" />
      <circle cx="8" cy="7.5" r="0.8" fill="currentColor" />
      <circle cx="10" cy="7.5" r="0.8" fill="currentColor" />
    </svg>
  )
}
