'use client'

import { useState, useTransition } from 'react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { mintInviteCodeWithOptions } from '@/app/(protected)/admin/invite-codes/actions'

type ExpiresIn = '7d' | '30d' | 'never'

// #1085 — default the expiry to "never" rather than 30d. Beta invite
// codes have been long-lived in practice, and a 30-day auto-expiry
// silently rots the batches Hugh sends to prospects; "never" matches
// how admins actually use the mint form.
export function InviteCreatorPanel() {
  const [expiresIn, setExpiresIn] = useState<ExpiresIn>('never')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{
    ok: boolean
    code?: string
    error?: string
  } | null>(null)

  function handleMint() {
    setResult(null)
    startTransition(async () => {
      const res = await mintInviteCodeWithOptions({ expiresIn })
      setResult(res)
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 16px',
        borderRadius: 12,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', gap: 4 }}>
        {(['7d', '30d', 'never'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setExpiresIn(opt)}
            style={{
              height: 32,
              padding: '0 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              border:
                expiresIn === opt
                  ? '2px solid var(--signal)'
                  : '1px solid var(--border)',
              background:
                expiresIn === opt ? 'rgba(29,95,191,0.08)' : 'transparent',
              color: expiresIn === opt ? 'var(--signal)' : 'var(--fg-muted)',
              cursor: 'pointer',
            }}
          >
            {opt}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={handleMint}
        disabled={isPending}
        style={{
          height: 32,
          padding: '0 16px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          border: 'none',
          background: 'var(--signal)',
          color: 'var(--fg-on-accent)',
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending
          ? ADMIN_COPY.inviteCodes.mintButton.pending
          : ADMIN_COPY.inviteCodes.mintButton.idle}
      </button>
      {result?.ok === true && result.code !== undefined && (
        <span
          style={{
            fontSize: 12,
            color: 'var(--success)',
            fontFamily: "'JetBrains Mono', monospace",
            padding: '3px 8px',
            background: 'rgba(47,122,77,0.08)',
            borderRadius: 6,
          }}
        >
          &#10003; {result.code}
        </span>
      )}
      {result?.ok === false && result.error !== undefined && (
        <span style={{ fontSize: 12, color: 'var(--danger)' }}>
          {result.error}
        </span>
      )}
    </div>
  )
}
