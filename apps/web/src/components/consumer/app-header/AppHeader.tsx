'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isTabActive } from '@/lib/nav-tab-active'
import { CCMark } from '@/components/brand/cc-mark'
import { UserMenu } from '../user-menu'
import { SearchPalette } from '../search-palette/SearchPalette'
import { AuthCtaPair } from './AuthCtaPair'
import { SignInRail } from './SignInRail'
import { MobileProfileEntry } from './MobileProfileEntry'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.appHeader

interface AppHeaderProps {
  /**
   * Top-right chrome slot. Callers pass components that live to the left of
   * the search action on mobile and to the left of the user menu on desktop —
   * currently used for the PWA install slot (#969) and offline pill (#970).
   */
  rightSlots?: React.ReactNode
}

export function AppHeader({ rightSlots }: AppHeaderProps = {}) {
  const pathname = usePathname()
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!((event.metaKey || event.ctrlKey) && event.key === 'k')) return
      const target = event.target as HTMLElement
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      )
        return
      event.preventDefault()
      setPaletteOpen(true)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <header className="w-full">
      {/* ── Mobile bar (hidden sm+) ─────────────────────── */}
      <div className="flex items-center justify-between bg-bg px-4 pb-2.5 pt-4 sm:hidden">
        <Link href="/events" className="flex items-center gap-2">
          <CCMark size={28} />
          <span
            className="text-[17px] font-extrabold tracking-[-0.02em] text-fg"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            {copy.brand.name}
            <span className="text-accent">{copy.brand.accent}</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {rightSlots}
          <AuthCtaPair />
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label={copy.search.ariaLabel}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border-strong"
          >
            <Search size={16} className="text-fg-muted" strokeWidth={1.5} />
          </button>
          <MobileProfileEntry />
        </div>
      </div>

      {/* Sign in drops out of the 320px header row and lands here */}
      <SignInRail />

      {/* ── Desktop TopNav (shown sm+) ──────────────────── */}
      <div className="sticky top-0 z-40 hidden h-16 w-full items-center justify-between border-b border-border bg-bg-elevated px-8 sm:flex">
        {/* Left: logo + nav tabs */}
        <div className="flex items-center gap-8">
          <Link href="/events" className="flex items-center gap-2.5">
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-[7px]">
              <CCMark size={32} />
            </div>
            <span
              className="text-[17px] font-extrabold tracking-[-0.02em] text-fg"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              {copy.brand.name}
              <span className="text-accent">{copy.brand.accent}</span>
            </span>
          </Link>

          <nav className="flex gap-1 overflow-x-auto">
            {copy.nav.tabs.map((tab) => {
              const isActive = isTabActive(tab, pathname)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'shrink-0 rounded-lg px-[14px] py-[8px] text-[13px] tracking-[-0.01em]',
                    isActive
                      ? 'bg-surface-2 font-bold text-fg'
                      : 'bg-transparent font-medium text-fg-muted transition-colors hover:bg-surface-1 hover:text-fg',
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right: search bar + user avatar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label={copy.search.ariaLabel}
            className="flex h-9 w-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface-1 px-3 text-fg-subtle lg:w-[280px] lg:justify-start"
          >
            <Search size={14} strokeWidth={1.5} className="shrink-0" />
            <span className="hidden flex-1 text-[13px] lg:block">
              {copy.search.placeholder}
            </span>
            <span
              className="hidden rounded border border-border-strong px-1.5 py-0.5 text-[10px] text-fg-subtle lg:block"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {copy.search.keyboardShortcut}
            </span>
          </button>

          {rightSlots}
          {/* Not passed through rightSlots — that prop is the PWA slot host and
              the auth pair's position in the bar is fixed, not caller-chosen. */}
          <AuthCtaPair />
          <UserMenu />
        </div>
      </div>

      <SearchPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  )
}
