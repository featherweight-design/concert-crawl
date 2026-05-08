'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useUser, useClerk } from '@clerk/nextjs'

export function UserAvatar() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  let initials = '?'
  if (user) {
    const first = user.firstName?.charAt(0) ?? ''
    const last = user.lastName?.charAt(0) ?? ''
    initials =
      first || last
        ? (first + last).toUpperCase()
        : (user.emailAddresses[0]?.emailAddress.charAt(0) ?? '?').toUpperCase()
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Account menu"
        aria-expanded={open}
        className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      >
        {user?.imageUrl ? (
          <Image
            src={user.imageUrl}
            alt={user.fullName ?? 'User avatar'}
            fill
            className="object-cover"
            sizes="36px"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-[13px] font-bold text-fg-muted"
            style={{ background: 'var(--surface-1)' }}
          >
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 min-w-[160px] rounded-lg border border-border bg-bg-elevated py-1 shadow-lg">
          <Link
            href="/me"
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-2 text-left text-[13px] text-fg-muted hover:bg-surface-1 hover:text-fg"
          >
            Settings
          </Link>
          <div className="mx-2 h-px bg-border" />
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full cursor-pointer px-4 py-2 text-left text-[13px] text-fg-muted hover:bg-surface-1 hover:text-fg"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
