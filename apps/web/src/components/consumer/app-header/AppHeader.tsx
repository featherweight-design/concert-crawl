import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { ThemeToggle } from '../theme-toggle'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-bg/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/events"
          className="flex items-center gap-2 font-semibold text-fg hover:text-signal transition-colors"
        >
          <span className="text-signal text-lg leading-none">◉</span>
          <span className="text-base tracking-tight">Concert Crawl</span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserButton />
        </div>
      </div>
    </header>
  )
}
