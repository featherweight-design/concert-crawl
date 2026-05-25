'use client'

import { useEffect } from 'react'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { copy } from './definitions/copy'

interface ProtectedErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ProtectedError({ error, reset }: ProtectedErrorProps) {
  const { signOut } = useClerk()
  const router = useRouter()

  useEffect(() => {
    console.error('[app error]', error)
  }, [error])

  function handleSignOut() {
    void signOut(() => router.push('/'))
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: '24px 16px',
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--font-ui)',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1
          style={{
            fontWeight: 900,
            fontSize: 20,
            letterSpacing: '-0.02em',
            color: 'var(--fg)',
            margin: 0,
          }}
        >
          {copy.errorHeading}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: 'var(--fg-muted)',
            margin: 0,
            maxWidth: 320,
          }}
        >
          {copy.errorBody}
        </p>
        {error.digest && (
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--fg-subtle)',
              margin: 0,
            }}
          >
            {error.digest}
          </p>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-1)',
            color: 'var(--fg)',
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {copy.tryAgainButton}
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            border: '1px solid transparent',
            background: 'var(--fg)',
            color: 'var(--bg)',
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {copy.signOutButton}
        </button>
      </div>
    </div>
  )
}
