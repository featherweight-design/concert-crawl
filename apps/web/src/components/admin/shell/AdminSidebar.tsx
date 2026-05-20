'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import * as LucideIcons from 'lucide-react'
import { LogOut } from 'lucide-react'
import { NAV_V2, type NavItem } from './nav'
import { CCMark } from '@/components/brand/cc-mark'
import { CCWordmark } from '@/components/brand/cc-wordmark'

type SidebarMode = 'full' | 'rail' | 'auto'
const STORAGE_KEY = 'cc-admin-sidebar'

interface AdminSidebarProps {
  badgeCounts?: { crawl: number; review: number; feedback: number }
  user: { firstName: string | null; email: string }
}

const NavIcon = ({ name, size }: { name: string; size: number }) => {
  const Icon = (
    LucideIcons as unknown as Record<
      string,
      React.ComponentType<{ size: number }>
    >
  )[name]
  return Icon ? <Icon size={size} /> : null
}

const NavLink = ({
  item,
  mode,
  active,
  count,
}: {
  item: NavItem
  mode: 'full' | 'rail'
  active: boolean
  count: number
}) => {
  const [hovered, setHovered] = useState(false)
  const showBadge = item.badge !== undefined

  return (
    <Link
      href={item.href}
      title={mode === 'rail' ? item.label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: mode === 'full' ? 12 : 0,
        justifyContent: mode === 'rail' ? 'center' : 'flex-start',
        padding: mode === 'full' ? '8px 10px 8px 14px' : '10px 0',
        borderRadius: 8,
        textDecoration: 'none',
        fontFamily: 'var(--admin-font, Inter, sans-serif)',
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        letterSpacing: '-0.005em',
        color: active ? 'var(--fg)' : 'var(--fg-muted)',
        background: active
          ? 'var(--surface-2)'
          : hovered
            ? 'var(--overlay-hover)'
            : 'transparent',
        position: 'relative',
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      {active && (
        <span
          style={{
            position: 'absolute',
            left: mode === 'rail' ? 6 : 0,
            top: 8,
            bottom: 8,
            width: 2,
            background: 'var(--signal)',
            borderRadius: 2,
          }}
        />
      )}
      <NavIcon name={item.iconName} size={17} />
      {mode === 'full' && <span style={{ flex: 1 }}>{item.label}</span>}
      {/* Full mode: numeric badge — only when count > 0 */}
      {mode === 'full' && showBadge && count > 0 && (
        <span
          style={{
            minWidth: 18,
            height: 18,
            padding: '0 5px',
            borderRadius: 9,
            background: `var(--${item.badge?.kind ?? 'danger'})`,
            color:
              item.badge?.kind === 'warning'
                ? 'var(--bg)'
                : 'var(--fg-on-accent, #fff)',
            fontSize: 10,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
      {/* Rail mode: dot — only when count > 0 */}
      {mode === 'rail' && showBadge && count > 0 && (
        <span
          style={{
            position: 'absolute',
            top: 6,
            right: 12,
            width: 8,
            height: 8,
            borderRadius: 4,
            background: `var(--${item.badge?.kind ?? 'danger'})`,
            boxShadow: '0 0 0 2px var(--surface-1)',
          }}
        />
      )}
    </Link>
  )
}

export const AdminSidebar = ({ badgeCounts, user }: AdminSidebarProps) => {
  const [mode, setMode] = useState<SidebarMode>('auto')
  const [viewportMode, setViewportMode] = useState<'full' | 'rail'>('full')
  const [signOutOpen, setSignOutOpen] = useState(false)
  const userCardRef = useRef<HTMLDivElement>(null)
  const { signOut } = useClerk()
  const pathname = usePathname()

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as SidebarMode | null
    const resolvedMode: SidebarMode =
      stored === 'full' || stored === 'rail' || stored === 'auto'
        ? stored
        : 'auto'
    setMode(resolvedMode)

    const mq = window.matchMedia('(min-width: 1280px)')
    const updateViewport = () => setViewportMode(mq.matches ? 'full' : 'rail')
    updateViewport()
    mq.addEventListener('change', updateViewport)
    return () => mq.removeEventListener('change', updateViewport)
  }, [])

  useEffect(() => {
    if (!signOutOpen) return
    const handleMouseDown = (evt: MouseEvent) => {
      if (
        userCardRef.current &&
        !userCardRef.current.contains(evt.target as Node)
      ) {
        setSignOutOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [signOutOpen])

  const toggleMode = () => {
    setMode((prev) => {
      const cycle: SidebarMode[] = ['full', 'rail', 'auto']
      const idx = cycle.indexOf(prev)
      const next = cycle[(idx + 1) % cycle.length] ?? 'auto'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }

  const effectiveMode: 'full' | 'rail' = mode === 'auto' ? viewportMode : mode
  const width = effectiveMode === 'full' ? 240 : 64

  const getCount = (key: string): number => {
    if (!badgeCounts) return 0
    if (key === 'crawl') return badgeCounts.crawl
    if (key === 'review') return badgeCounts.review
    if (key === 'feedback') return badgeCounts.feedback
    return 0
  }

  const userInitial = (user.firstName ?? user.email).charAt(0).toUpperCase()
  const opsItems = NAV_V2.filter((item) => item.section === 'operations')
  const accountItems = NAV_V2.filter((item) => item.section === 'account')

  return (
    <aside
      style={{
        width,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--surface-1)',
        transition: 'width 0.18s ease',
        overflow: 'hidden',
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          padding: effectiveMode === 'full' ? '16px 16px' : '16px 0',
          display: 'flex',
          justifyContent: effectiveMode === 'rail' ? 'center' : 'flex-start',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          height: 64,
          boxSizing: 'border-box',
        }}
      >
        {effectiveMode === 'full' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <CCMark size={30} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <CCWordmark size={13} />
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 14,
                  padding: '0 5px',
                  borderRadius: 999,
                  background: 'rgba(122,58,168,0.18)',
                  color: 'var(--accent)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.08em',
                  alignSelf: 'flex-start',
                }}
              >
                ADMIN
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <CCMark size={28} />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: effectiveMode === 'full' ? '12px 10px' : '10px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
        }}
      >
        {effectiveMode === 'full' && (
          <div
            style={{
              padding: '6px 8px 8px',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--fg-subtle)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Operations
          </div>
        )}
        {opsItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))
          const count = getCount(item.key)
          return (
            <NavLink
              key={item.key}
              item={item}
              mode={effectiveMode}
              active={active}
              count={count}
            />
          )
        })}
        {effectiveMode === 'full' && (
          <div
            style={{
              padding: '16px 8px 8px',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--fg-subtle)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Account
          </div>
        )}
        {accountItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <NavLink
              key={item.key}
              item={item}
              mode={effectiveMode}
              active={active}
              count={0}
            />
          )
        })}
      </nav>

      {/* User card */}
      <div
        ref={userCardRef}
        style={{
          position: 'relative',
          padding: effectiveMode === 'full' ? '10px 10px 0' : '10px 8px 0',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {signOutOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 4px)',
              left: 8,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: 'var(--shadow-md)',
              minWidth: 160,
              zIndex: 50,
              padding: 4,
            }}
          >
            <button
              onClick={() => {
                void signOut({ redirectUrl: '/' })
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '7px 10px',
                background: 'transparent',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                color: 'var(--fg-muted)',
                fontSize: 13,
                textAlign: 'left',
              }}
              onMouseEnter={(evt) => {
                evt.currentTarget.style.background = 'var(--overlay-hover)'
              }}
              onMouseLeave={(evt) => {
                evt.currentTarget.style.background = 'transparent'
              }}
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        )}
        {effectiveMode === 'full' ? (
          <button
            onClick={() => setSignOutOpen((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 10px',
              borderRadius: 7,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                background:
                  'linear-gradient(135deg, var(--accent), var(--signal))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--fg-on-accent, #fff)',
                flexShrink: 0,
              }}
            >
              {userInitial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--fg)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--admin-font, Inter, sans-serif)',
                  lineHeight: 1.2,
                }}
              >
                {user.firstName ?? user.email}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--fg-subtle)',
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.04em',
                }}
              >
                admin
              </div>
            </div>
          </button>
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '8px 0',
            }}
          >
            <button
              onClick={() => setSignOutOpen((prev) => !prev)}
              aria-label="User menu"
              title="User menu"
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                background:
                  'linear-gradient(135deg, var(--accent), var(--signal))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--fg-on-accent, #fff)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {userInitial}
            </button>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <div
        style={{
          padding: '12px 8px',
          borderTop: '1px solid var(--border)',
        }}
      >
        <button
          onClick={toggleMode}
          title={
            mode === 'full'
              ? 'Switch to rail'
              : mode === 'rail'
                ? 'Switch to auto'
                : 'Switch to full'
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: effectiveMode === 'rail' ? 'center' : 'flex-start',
            gap: 10,
            padding: '6px 10px',
            background: 'transparent',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            color: 'var(--fg-muted)',
            fontSize: 12,
            width: '100%',
          }}
        >
          <NavIcon
            name={effectiveMode === 'full' ? 'PanelLeftClose' : 'PanelLeft'}
            size={16}
          />
          {effectiveMode === 'full' && (
            <span>
              {mode === 'auto'
                ? 'Auto'
                : mode === 'full'
                  ? 'Collapse'
                  : 'Expand'}
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
