'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import * as LucideIcons from 'lucide-react'
import { Menu } from 'lucide-react'
import { AdminSidebar } from './AdminSidebar'
import { AdminTopbar } from './AdminTopbar'
import { MobileBottomBar } from './MobileBottomBar'
import { MobileDrawer } from './MobileDrawer'
import { AppSwitcher } from './AppSwitcher'
import { NAV_V2 } from './nav'
import { PageTitleProvider, usePageTitle } from './PageTitleContext'

const MOBILE_BREAKPOINT = 720

interface AdminShellClientProps {
  badgeCounts: { crawl: number; review: number; feedback: number }
  user: { firstName: string | null; email: string }
  children: React.ReactNode
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

const MobileTopbar = ({ onMenuOpen }: { onMenuOpen: () => void }) => {
  const { pageTitle } = usePageTitle()
  const pathname = usePathname()
  const activeItem = NAV_V2.find(
    (item) =>
      pathname === item.href ||
      (item.href !== '/admin' && pathname.startsWith(item.href)),
  )
  const title = pageTitle ?? activeItem?.label ?? 'Admin'

  return (
    <header
      style={{
        height: 52,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
      }}
    >
      <button
        onClick={onMenuOpen}
        aria-label="Open navigation menu"
        style={{
          padding: 8,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--fg-muted)',
          borderRadius: 8,
          display: 'flex',
        }}
      >
        <Menu size={18} />
      </button>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {activeItem && <NavIcon name={activeItem.iconName} size={16} />}
        <span
          style={{
            fontFamily: 'var(--admin-font, Inter, sans-serif)',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--fg)',
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>
      </div>
      <AppSwitcher size="sm" />
    </header>
  )
}

const ShellInner = ({
  badgeCounts,
  user,
  isMobile,
  children,
}: AdminShellClientProps & { isMobile: boolean }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (isMobile) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg)',
          color: 'var(--fg)',
          fontFamily: 'var(--admin-font, Inter, sans-serif)',
          position: 'relative',
        }}
      >
        <MobileTopbar onMenuOpen={() => setDrawerOpen(true)} />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 14px 84px',
            background: 'var(--bg)',
          }}
        >
          {children}
        </main>
        <MobileBottomBar badgeCounts={badgeCounts} />
        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          badgeCounts={badgeCounts}
          user={user}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
      }}
    >
      <AdminSidebar badgeCounts={badgeCounts} user={user} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <AdminTopbar />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px',
            background: 'var(--bg)',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

export const AdminShellClient = ({
  badgeCounts,
  user,
  children,
}: AdminShellClientProps) => {
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  if (!mounted) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
        }}
      >
        <div style={{ width: 240, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    )
  }

  return (
    <PageTitleProvider>
      <ShellInner badgeCounts={badgeCounts} user={user} isMobile={isMobile}>
        {children}
      </ShellInner>
    </PageTitleProvider>
  )
}
