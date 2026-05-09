'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { NAV } from './nav'
import { buildBreadcrumbs } from './breadcrumbs'

const useBreadcrumbs = () => {
  const pathname = usePathname()
  return buildBreadcrumbs(pathname, NAV)
}

export const AdminTopbar = () => {
  const crumbs = useBreadcrumbs()

  return (
    <header
      style={{
        height: 52,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '0 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
      }}
    >
      <nav
        aria-label="Breadcrumb"
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
      >
        {crumbs.map((crumb, idx) => (
          <span
            key={crumb.label}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
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
              <span
                style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}
              >
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>
    </header>
  )
}
