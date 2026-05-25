'use client'

import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { NAV_V2 } from './nav'
import { buildBreadcrumbs } from './breadcrumbs'
import { usePageTitle } from './PageTitleContext'
import { AppSwitcher } from './AppSwitcher'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const useBreadcrumbs = (pageTitle: string | null) => {
  const pathname = usePathname()
  const crumbs = buildBreadcrumbs(pathname, NAV_V2)
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
        height: 56,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        gap: 16,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flex: 1,
          minWidth: 0,
        }}
      >
        <AppSwitcher />
        <span
          style={{
            width: 1,
            height: 18,
            background: 'var(--border)',
            flexShrink: 0,
          }}
        />
        <nav
          aria-label={ADMIN_COPY.shell.topbar.breadcrumbAriaLabel}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minWidth: 0,
          }}
        >
          {crumbs.map((crumb, idx) => (
            <span
              key={crumb.label}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {idx > 0 && <ChevronRight size={12} color="var(--fg-subtle)" />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  style={{
                    fontFamily: 'var(--admin-font, Inter, sans-serif)',
                    fontSize: 13,
                    fontWeight: idx === crumbs.length - 1 ? 600 : 500,
                    color: 'var(--fg-muted)',
                    textDecoration: 'none',
                    letterSpacing: '-0.005em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  style={{
                    fontFamily: 'var(--admin-font, Inter, sans-serif)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--fg)',
                    letterSpacing: '-0.005em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      </div>
    </header>
  )
}
