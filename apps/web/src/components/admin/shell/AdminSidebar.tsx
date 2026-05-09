'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import * as LucideIcons from 'lucide-react'
import { LogOut } from 'lucide-react'
import { NAV, type NavItem } from './nav'

type SidebarMode = 'full' | 'rail' | 'auto'
const STORAGE_KEY = 'cc-admin-sidebar'

interface AdminSidebarProps {
  badgeCounts?: { crawl: number; events: number }
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
        gap: mode === 'full' ? 10 : 0,
        justifyContent: mode === 'rail' ? 'center' : 'flex-start',
        padding: mode === 'full' ? '7px 10px' : '7px 0',
        borderRadius: 7,
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--fg)' : 'var(--fg-muted)',
        background: active
          ? 'var(--surface-2)'
          : hovered
            ? 'var(--overlay-hover)'
            : 'transparent',
        borderLeft: active
          ? '2px solid var(--signal)'
          : '2px solid transparent',
        position: 'relative',
        transition: 'background 0.12s',
      }}
    >
      <NavIcon name={item.iconName} size={16} />
      {mode === 'full' && <span style={{ flex: 1 }}>{item.label}</span>}
      {/* Full mode: numeric badge or dot */}
      {mode === 'full' &&
        showBadge &&
        (count > 0 ? (
          <span
            style={{
              marginLeft: 'auto',
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 999,
              background: `var(--${item.badge?.kind ?? 'danger'})`,
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              flexShrink: 0,
            }}
          >
            {count}
          </span>
        ) : (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: `var(--${item.badge?.kind ?? 'danger'})`,
              flexShrink: 0,
            }}
          />
        ))}
      {/* Rail mode: dot */}
      {mode === 'rail' && showBadge && (
        <span
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: `var(--${item.badge?.kind ?? 'danger'})`,
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
    if (key === 'events') return badgeCounts.events
    return 0
  }

  const userInitial = (user.firstName ?? user.email).charAt(0).toUpperCase()

  return (
    <aside
      style={{
        width,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        transition: 'width 0.18s ease',
        overflow: 'hidden',
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          padding: effectiveMode === 'full' ? '16px 16px 12px' : '16px 0 12px',
          display: 'flex',
          justifyContent: effectiveMode === 'rail' ? 'center' : 'flex-start',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {effectiveMode === 'full' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Logo mark */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#0d0c09',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="2.5" fill="#c89bf0" />
                <circle cx="3" cy="4" r="1.5" fill="#7ab4ff" opacity="0.8" />
                <circle cx="15" cy="3" r="1" fill="#c89bf0" opacity="0.6" />
                <circle cx="14" cy="14" r="1.5" fill="#7ab4ff" opacity="0.7" />
                <circle cx="4" cy="13" r="1" fill="#c89bf0" opacity="0.5" />
                <line
                  x1="3"
                  y1="4"
                  x2="9"
                  y2="9"
                  stroke="#7ab4ff"
                  strokeWidth="0.75"
                  opacity="0.4"
                />
                <line
                  x1="9"
                  y1="9"
                  x2="14"
                  y2="14"
                  stroke="#c89bf0"
                  strokeWidth="0.75"
                  opacity="0.4"
                />
                <line
                  x1="15"
                  y1="3"
                  x2="9"
                  y2="9"
                  stroke="#7ab4ff"
                  strokeWidth="0.75"
                  opacity="0.4"
                />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 800,
                  fontSize: 13,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                <span style={{ color: 'var(--fg)' }}>concert</span>
                <span style={{ color: 'var(--accent)' }}>crawl.</span>
              </div>
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
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#0d0c09',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="2.5" fill="#c89bf0" />
              <circle cx="3" cy="4" r="1.5" fill="#7ab4ff" opacity="0.8" />
              <circle cx="15" cy="3" r="1" fill="#c89bf0" opacity="0.6" />
              <circle cx="14" cy="14" r="1.5" fill="#7ab4ff" opacity="0.7" />
              <circle cx="4" cy="13" r="1" fill="#c89bf0" opacity="0.5" />
              <line
                x1="3"
                y1="4"
                x2="9"
                y2="9"
                stroke="#7ab4ff"
                strokeWidth="0.75"
                opacity="0.4"
              />
              <line
                x1="9"
                y1="9"
                x2="14"
                y2="14"
                stroke="#c89bf0"
                strokeWidth="0.75"
                opacity="0.4"
              />
              <line
                x1="15"
                y1="3"
                x2="9"
                y2="9"
                stroke="#7ab4ff"
                strokeWidth="0.75"
                opacity="0.4"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {NAV.map((item, idx) => {
          const prevItem = idx > 0 ? NAV[idx - 1] : null
          const isNewSection = item.section !== prevItem?.section
          const active =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))
          const count = getCount(item.key)

          return (
            <div key={item.key}>
              {isNewSection &&
                effectiveMode === 'full' &&
                item.section === 'account' && (
                  <>
                    <div
                      style={{
                        height: 1,
                        background: 'var(--border)',
                        margin: '6px 0',
                      }}
                    />
                    <div
                      style={{
                        padding: '4px 10px',
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--fg-subtle)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      Account
                    </div>
                  </>
                )}
              <NavLink
                item={item}
                mode={effectiveMode}
                active={active}
                count={count}
              />
            </div>
          )
        })}
      </nav>

      {/* User card */}
      <div
        ref={userCardRef}
        style={{
          position: 'relative',
          padding: '8px 8px 0',
          borderTop: '1px solid var(--border)',
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
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
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
                }}
              >
                {user.firstName ?? user.email}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--fg-subtle)',
                  fontFamily: "'JetBrains Mono', monospace",
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
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {userInitial}
            </button>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div
        style={{
          padding: '12px 8px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
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
