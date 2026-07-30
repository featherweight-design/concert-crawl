'use client'

import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.appHeader.auth

/**
 * Quiet Sign in link + filled Sign up pill, for the desktop header row. The
 * Sign in link is `hidden sm:inline-flex` because at 320px it drops to
 * `SignInRail` beneath the header — a CSS breakpoint rather than a matchMedia
 * read, so first paint never flashes the wrong arrangement.
 */
export function AuthCtaPair() {
  const { isSignedIn } = useAuth()
  if (isSignedIn) return null

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link
        href={copy.signInHref}
        className="hidden h-9 items-center rounded-lg px-2.5 text-[13px] font-medium text-fg-muted transition-colors hover:text-fg sm:inline-flex"
      >
        {copy.signIn}
      </Link>
      <Link
        href={copy.signUpHref}
        className="inline-flex h-9 items-center rounded-lg bg-signal px-3.5 text-[13px] font-bold tracking-[-0.01em] text-bg"
      >
        {copy.signUp}
      </Link>
    </div>
  )
}
