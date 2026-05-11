'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { NAV } from './nav'
import { buildBreadcrumbs } from './breadcrumbs'
import { usePageTitle } from './PageTitleContext'

const useBreadcrumbs = (pageTitle: string | null) => {
  const pathname = usePathname()
  const crumbs = buildBreadcrumbs(pathname, NAV)
  if (pageTitle && crumbs.length > 0) {
    return [...crumbs.slice(0, -1), { label: pageTitle }]
  }
  return crumbs
}

export const AdminTopbar = () => {
  const { pageTitle } = usePageTitle()
  const crumbs = useBreadcrumbs(pageTitle)

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
