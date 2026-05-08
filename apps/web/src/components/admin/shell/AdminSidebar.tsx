'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as LucideIcons from 'lucide-react'
import { NAV, type NavItem } from './nav'

type SidebarMode = 'full' | 'rail'
const STORAGE_KEY = 'cc-admin-sidebar'

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
}: {
  item: NavItem
  mode: SidebarMode
  active: boolean
}) => {
  const [hovered, setHovered] = useState(false)

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
      {mode === 'full' && item.badge && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: `var(--${item.badge.kind})`,
            flexShrink: 0,
          }}
        />
      )}
      {mode === 'rail' && item.badge && (
        <span
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: `var(--${item.badge.kind})`,
          }}
        />
      )}
    </Link>
  )
}

export const AdminSidebar = () => {
  const [mode, setMode] = useState<SidebarMode>('full')
  const pathname = usePathname()

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as SidebarMode | null
    if (stored) setMode(stored)
  }, [])

  const toggleMode = () => {
    setMode((prev) => {
      const next: SidebarMode = prev === 'full' ? 'rail' : 'full'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }

  const width = mode === 'full' ? 240 : 64

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
          padding: mode === 'full' ? '16px 16px 12px' : '16px 0 12px',
          display: 'flex',
          justifyContent: mode === 'rail' ? 'center' : 'flex-start',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {mode === 'full' ? (
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
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <NavLink key={item.key} item={item} mode={mode} active={active} />
          )
        })}
      </nav>

      {/* Bottom */}
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
          title={mode === 'full' ? 'Collapse sidebar' : 'Expand sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: mode === 'rail' ? 'center' : 'flex-start',
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
            name={mode === 'full' ? 'PanelLeftClose' : 'PanelLeft'}
            size={16}
          />
          {mode === 'full' && 'Collapse'}
        </button>
      </div>
    </aside>
  )
}
