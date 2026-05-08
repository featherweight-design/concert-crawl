'use client'

import { useAdminTheme } from './AdminThemeProvider'
import { UserButton } from '@clerk/nextjs'
import { Sun, Moon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { NAV } from './nav'

const useBreadcrumb = () => {
  const pathname = usePathname()
  const item = NAV.find((nav) =>
    nav.href !== '/admin'
      ? pathname.startsWith(nav.href)
      : pathname === '/admin',
  )
  return item?.label ?? 'Admin'
}

export const AdminTopbar = () => {
  const { theme, toggle } = useAdminTheme()
  const breadcrumb = useBreadcrumb()

  return (
    <header
      style={{
        height: 52,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
        {breadcrumb}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={toggle}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 6,
            background: 'transparent',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            color: 'var(--fg-muted)',
          }}
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        </button>
        <UserButton />
      </div>
    </header>
  )
}
