'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as LucideIcons from 'lucide-react'
import { NAV_V2 } from './nav'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

interface MobileBottomBarProps {
  badgeCounts?: { crawl: number; review: number; feedback: number }
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

const getCount = (
  key: string,
  counts?: { crawl: number; review: number; feedback: number },
): number => {
  if (!counts) return 0
  if (key === 'crawl') return counts.crawl
  if (key === 'review') return counts.review
  if (key === 'feedback') return counts.feedback
  return 0
}

export const MobileBottomBar = ({ badgeCounts }: MobileBottomBarProps) => {
  const pathname = usePathname()
  const tabItems = NAV_V2.filter((item) => item.section === 'operations')

  return (
    <nav
      aria-label={ADMIN_COPY.shell.mobileBottomBar.navAriaLabel}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: 64,
        padding: '6px 6px 10px',
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
        display: 'grid',
        gridTemplateColumns: `repeat(${tabItems.length}, 1fr)`,
        gap: 4,
        zIndex: 40,
      }}
    >
      {tabItems.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== '/admin' && pathname.startsWith(item.href))
        const count = getCount(item.key, badgeCounts)
        const showBadge = item.badge !== undefined && count > 0

        return (
          <Link
            key={item.key}
            href={item.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '4px 0',
              borderRadius: 8,
              textDecoration: 'none',
              color: active ? 'var(--signal)' : 'var(--fg-muted)',
              position: 'relative',
            }}
          >
            <div style={{ position: 'relative', display: 'flex' }}>
              <NavIcon name={item.iconName} size={20} />
              {showBadge && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    minWidth: 16,
                    height: 16,
                    padding: '0 4px',
                    borderRadius: 8,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color:
                      item.badge?.kind === 'warning'
                        ? 'var(--bg)'
                        : 'var(--fg-on-accent, #fff)',
                    background: `var(--${item.badge?.kind ?? 'danger'})`,
                    boxShadow: '0 0 0 2px var(--bg-elevated)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </div>
            <span
              style={{
                fontFamily: 'var(--admin-font, Inter, sans-serif)',
                fontSize: 10,
                fontWeight: active ? 700 : 600,
                letterSpacing: '-0.005em',
              }}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
