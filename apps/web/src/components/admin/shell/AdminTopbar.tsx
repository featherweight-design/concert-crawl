'use client'

import { useAdminTheme, VALID_THEMES } from './AdminThemeProvider'
import { UserButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { NAV } from './nav'

interface Crumb {
  label: string
  href?: string
}

const useBreadcrumbs = (): Crumb[] => {
  const pathname = usePathname()
  const section = NAV.find((nav) =>
    nav.href !== '/admin'
      ? pathname.startsWith(nav.href)
      : pathname === '/admin',
  )
  if (!section) return [{ label: 'Admin' }]

  if (pathname === section.href) return [{ label: section.label }]

  const sub = pathname.slice(section.href.length).replace(/^\//, '')
  let subLabel = 'Details'
  if (sub === 'new') subLabel = 'New venue'
  else if (sub && sub !== '') subLabel = 'Edit venue'

  return [{ label: section.label, href: section.href }, { label: subLabel }]
}

export const AdminTopbar = () => {
  const { theme, setTheme } = useAdminTheme()
  const crumbs = useBreadcrumbs()

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
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {crumbs.map((crumb, idx) => (
          <span key={crumb.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {idx > 0 && (
              <span style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>/</span>
            )}
            {crumb.href ? (
              <Link
                href={crumb.href}
                style={{
                  fontSize: 14,
                  fontWeight: idx === crumbs.length - 1 ? 600 : 400,
                  color: 'var(--fg-muted)',
                  textDecoration: 'none',
                }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>
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
          {VALID_THEMES.map((themeOption) => (
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
