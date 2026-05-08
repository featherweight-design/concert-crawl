'use client'

import { useAdminTheme } from './AdminThemeProvider'
import { UserButton } from '@clerk/nextjs'
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
  const { theme, setTheme } = useAdminTheme()
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
        <div
          role="group"
          aria-label="Theme"
          style={{
            display: 'flex',
            background: 'var(--surface-1)',
            borderRadius: 8,
            padding: 2,
            gap: 2,
            border: '1px solid var(--border)',
          }}
        >
          {(['light', 'dark'] as const).map((themeOption) => (
            <button
              key={themeOption}
              onClick={() => setTheme(themeOption)}
              aria-pressed={theme === themeOption}
              style={{
                height: 26,
                padding: '0 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background:
                  theme === themeOption ? 'var(--bg-elevated)' : 'transparent',
                color: theme === themeOption ? 'var(--fg)' : 'var(--fg-muted)',
                boxShadow: theme === themeOption ? 'var(--shadow-sm)' : 'none',
                transition: 'background 0.1s, color 0.1s',
              }}
            >
              {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
            </button>
          ))}
        </div>
        <UserButton />
      </div>
    </header>
  )
}
