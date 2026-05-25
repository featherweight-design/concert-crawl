'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import * as LucideIcons from 'lucide-react'
import { X, LogOut } from 'lucide-react'
import { NAV_V2 } from './nav'
import { CCMark } from '@/components/brand/cc-mark'
import { CCWordmark } from '@/components/brand/cc-wordmark'
import { AppSwitcher } from './AppSwitcher'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  badgeCounts?: { crawl: number; review: number; feedback: number }
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

export const MobileDrawer = ({
  open,
  onClose,
  badgeCounts,
  user,
}: MobileDrawerProps) => {
  const pathname = usePathname()
  const { signOut } = useClerk()

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const userInitial = (user.firstName ?? user.email).charAt(0).toUpperCase()
  const opsItems = NAV_V2.filter((item) => item.section === 'operations')
  const accountItems = NAV_V2.filter((item) => item.section === 'account')

  if (!open) return null

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 50,
        }}
      />
      {/* Sheet */}
      <aside
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: '78%',
          maxWidth: 320,
          background: 'var(--bg-elevated)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 51,
          boxShadow: '8px 0 32px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '16px 14px',
            borderBottom: '1px solid var(--border)',
            height: 64,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <CCMark size={30} />
          </div>
          <CCWordmark size={13} />
          <button
            onClick={onClose}
            aria-label={ADMIN_COPY.shell.mobileDrawer.closeMenuAriaLabel}
            style={{
              marginLeft: 'auto',
              padding: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--fg-subtle)',
              borderRadius: 6,
              display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* AppSwitcher */}
        <div style={{ padding: '12px 12px 4px' }}>
          <AppSwitcher />
        </div>

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            padding: '4px 10px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              padding: '6px 8px 8px',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--fg-subtle)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {ADMIN_COPY.shell.mobileDrawer.sectionOperations}
          </div>
          {opsItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href))
            const count = getCount(item.key, badgeCounts)
            const showBadge = item.badge !== undefined && count > 0

            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 10px 8px 14px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontFamily: 'var(--admin-font, Inter, sans-serif)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  letterSpacing: '-0.005em',
                  color: active ? 'var(--fg)' : 'var(--fg-muted)',
                  background: active ? 'var(--surface-2)' : 'transparent',
                  position: 'relative',
                }}
              >
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 8,
                      bottom: 8,
                      width: 2,
                      background: 'var(--signal)',
                      borderRadius: 2,
                    }}
                  />
                )}
                <NavIcon name={item.iconName} size={17} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {showBadge && (
                  <span
                    style={{
                      minWidth: 18,
                      height: 18,
                      padding: '0 5px',
                      borderRadius: 9,
                      background: `var(--${item.badge?.kind ?? 'danger'})`,
                      color:
                        item.badge?.kind === 'warning'
                          ? 'var(--bg)'
                          : 'var(--fg-on-accent, #fff)',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'JetBrains Mono', monospace",
                      flexShrink: 0,
                    }}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </Link>
            )
          })}

          <div
            style={{
              padding: '16px 8px 8px',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--fg-subtle)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {ADMIN_COPY.shell.mobileDrawer.sectionAccount}
          </div>
          {accountItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 10px 8px 14px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontFamily: 'var(--admin-font, Inter, sans-serif)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  letterSpacing: '-0.005em',
                  color: active ? 'var(--fg)' : 'var(--fg-muted)',
                  background: active ? 'var(--surface-2)' : 'transparent',
                  position: 'relative',
                }}
              >
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 8,
                      bottom: 8,
                      width: 2,
                      background: 'var(--signal)',
                      borderRadius: 2,
                    }}
                  />
                )}
                <NavIcon name={item.iconName} size={17} />
                <span style={{ flex: 1 }}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User row */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '10px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 7,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                background:
                  'linear-gradient(135deg, var(--accent), var(--signal))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--fg-on-accent, #fff)',
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
                  fontSize: 10,
                  color: 'var(--fg-subtle)',
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.04em',
                }}
              >
                {ADMIN_COPY.shell.mobileDrawer.userRoleLabel}
              </div>
            </div>
            <button
              onClick={() => void signOut({ redirectUrl: '/' })}
              aria-label={ADMIN_COPY.shell.mobileDrawer.signOutAriaLabel}
              title={ADMIN_COPY.shell.mobileDrawer.signOutTitle}
              style={{
                padding: 6,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--fg-muted)',
                borderRadius: 6,
                display: 'flex',
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
