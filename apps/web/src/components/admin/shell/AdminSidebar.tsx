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
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 800,
              fontSize: 13,
              color: 'var(--fg)',
            }}
          >
            concertcrawl./admin
          </span>
        ) : (
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 800,
              fontSize: 13,
              color: 'var(--fg)',
            }}
          >
            cc/
          </span>
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
