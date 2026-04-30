'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  {
    key: 'browse',
    label: 'browse',
    href: '/events',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <rect
          x="1"
          y="1"
          width="7"
          height="7"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="10"
          y="1"
          width="7"
          height="7"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="1"
          y="10"
          width="7"
          height="7"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="10"
          y="10"
          width="7"
          height="7"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    key: 'search',
    label: 'search',
    href: '/search',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12.5 12.5L16 16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: 'saved',
    label: 'saved',
    href: '/saved',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M9 15l-6.5-6A3.5 3.5 0 019 4.5 3.5 3.5 0 0115.5 9L9 15z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: 'me',
    label: 'me',
    href: '/me',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M2.5 16.5c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-[52px] items-center justify-around border-t border-border bg-bg-elevated pb-0.5 sm:hidden"
      aria-label="Main navigation"
    >
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className="flex flex-col items-center gap-[3px]"
            style={{ color: isActive ? 'var(--signal)' : 'var(--fg-subtle)' }}
          >
            {tab.icon}
            <span
              className="text-[9px] tracking-[0.04em]"
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
