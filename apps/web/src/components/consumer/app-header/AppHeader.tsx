import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { Search } from 'lucide-react'
import { ThemeToggle } from '../theme-toggle'
import { CCMark } from '../cc-mark'

export function AppHeader() {
  return (
    <header className="w-full">
      {/* ── Mobile bar (hidden sm+) ─────────────────────── */}
      <div className="flex items-center justify-between bg-bg px-4 pb-2.5 pt-[62px] sm:hidden">
        <Link href="/events" className="flex items-center gap-2">
          <CCMark size={28} />
          <span
            className="text-[17px] font-extrabold tracking-[-0.02em] text-fg"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            concert
            <span className="text-accent">crawl.</span>
          </span>
        </Link>
        <Link
          href="/search"
          aria-label="Search"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong"
        >
          <Search size={16} className="text-fg-muted" strokeWidth={1.5} />
        </Link>
      </div>

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
              concert<span className="text-accent">crawl.</span>
            </span>
          </Link>

          <nav className="flex gap-1">
            {[
              { label: 'Browse', href: '/events' },
              { label: 'Search', href: '/search' },
              { label: 'Saved', href: '/saved' },
            ].map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="rounded-lg px-3.5 py-2 text-[13px] font-medium tracking-[-0.01em] text-fg-muted transition-colors hover:bg-surface-1 hover:text-fg"
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: search bar + user + theme */}
        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="flex h-9 w-[280px] items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 text-fg-subtle"
          >
            <Search size={14} strokeWidth={1.5} />
            <span className="flex-1 text-[13px]">
              Search artists or venues…
            </span>
            <span
              className="rounded border border-border-strong px-1.5 py-0.5 text-[10px] text-fg-subtle"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              ⌘K
            </span>
          </Link>

          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2">
            <UserButton />
          </div>

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
