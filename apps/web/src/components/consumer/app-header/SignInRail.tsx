'use client'

import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.appHeader.auth

/**
 * Where the Sign in link goes at 320px, once the header row is down to one CTA.
 * Both affordances exist at every width — only the position moves.
 */
export function SignInRail() {
  const { isSignedIn } = useAuth()
  if (isSignedIn) return null

  return (
    <div className="flex justify-end bg-bg px-4 pb-2 sm:hidden">
      <Link
        href={copy.signInHref}
        className="inline-flex min-h-[44px] items-center text-[11px] font-semibold tracking-[0.04em] text-fg-muted"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {copy.signIn}
      </Link>
    </div>
  )
}
