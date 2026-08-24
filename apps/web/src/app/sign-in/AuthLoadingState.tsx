'use client'

import { useCallback, useEffect, useState } from 'react'
import { SIGN_IN_COPY } from './definitions/copy'

// Clerk's script is fetched from clerk.concertcrawl.app. A blocker such as
// Brave Shields drops that request without ever erroring, so <SignIn /> never
// mounts and nothing reports a failure. This timeout is the only signal we get
// that it is never arriving.
export const AUTH_LOAD_TIMEOUT_MS = 10000

export const AuthLoadingState = () => {
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), AUTH_LOAD_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [])

  const onRetry = useCallback(() => {
    // A soft refresh reuses the already-failed script tag; a full reload refetches it.
    window.location.reload()
  }, [])

  if (!timedOut) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={SIGN_IN_COPY.loading.aria}
        className="flex w-full max-w-sm flex-col gap-4 px-5"
      >
        <div
          aria-hidden="true"
          className="h-8 w-1/2 animate-pulse rounded-md border border-border bg-surface-1"
        />
        <div
          aria-hidden="true"
          className="h-11 w-full animate-pulse rounded-md border border-border bg-surface-1"
        />
        <div
          aria-hidden="true"
          className="h-11 w-full animate-pulse rounded-md border border-border bg-surface-1"
        />
        <div
          aria-hidden="true"
          className="h-11 w-full animate-pulse rounded-md border border-border bg-surface-1"
        />
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3 px-5">
      <span
        className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {SIGN_IN_COPY.unavailable.eyebrow}
      </span>
      <h1 className="text-2xl font-extrabold text-fg">
        {SIGN_IN_COPY.unavailable.title}
      </h1>
      <p className="text-sm text-fg-muted">{SIGN_IN_COPY.unavailable.sub}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-[44px] w-fit items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-fg-on-accent"
      >
        {SIGN_IN_COPY.unavailable.retry}
      </button>
    </div>
  )
}
