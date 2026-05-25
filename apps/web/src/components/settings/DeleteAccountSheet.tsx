'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { deleteAccount } from '@/lib/users'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const SETTINGS_COPY = CONSUMER_COPY.settings

interface DeleteAccountSheetProps {
  open: boolean
  onClose: () => void
  handle?: string | null
  submissionCount?: number
}

export function DeleteAccountSheet({
  open,
  onClose,
  handle,
  submissionCount,
}: DeleteAccountSheetProps) {
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  const router = useRouter()

  const isArmed = inputValue === 'DELETE'

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)')
    setIsDesktop(mql.matches)
    const handler = (ev: MediaQueryListEvent) => setIsDesktop(ev.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setInputValue('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  async function handleDelete() {
    if (!isArmed || loading) return
    setLoading(true)
    try {
      const token = await getToken()
      if (token) await deleteAccount(token)
      await signOut()
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  if (isDesktop) {
    return (
      <>
        {/* Scrim */}
        <div
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={onClose}
        />
        {/* Dialog */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          }}
        >
          <h2
            id="delete-dialog-title"
            className="mb-2 text-fg"
            style={{ fontSize: 20, fontWeight: 900 }}
          >
            Delete your account?
          </h2>
          <p className="mb-4 text-[13px] leading-relaxed text-fg-muted">
            <strong style={{ color: 'var(--danger)' }}>
              This can&apos;t be undone.
            </strong>{' '}
            Your handle
            {handle ? (
              <>
                {' '}
                <strong>@{handle}</strong>,
              </>
            ) : (
              ','
            )}{' '}
            email, and plan are deleted. {submissionCount ?? 0} submitted{' '}
            {submissionCount === 1 ? 'price stays' : 'prices stay'} on the
            public record — your name is removed from them.
          </p>
          <label
            className="mb-1.5 block text-[13px] font-medium text-fg-muted"
            htmlFor="delete-confirm-desktop"
          >
            Type <strong>DELETE</strong> to confirm.
          </label>
          <input
            ref={inputRef}
            id="delete-confirm-desktop"
            type="text"
            value={inputValue}
            onChange={(evt) => setInputValue(evt.target.value)}
            placeholder="DELETE"
            className="mb-4 w-full rounded-lg border border-border bg-surface-1 px-4 py-3 text-fg placeholder:text-fg-subtle focus:outline-none focus:border-border-focus"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '0.06em',
              ...(isArmed ? { borderColor: 'var(--danger)' } : {}),
            }}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-3 text-[14px] font-bold text-fg transition-colors hover:bg-surface-1"
              style={{ background: 'var(--surface-1)' }}
            >
              Keep my account
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={!isArmed || loading}
              className="flex-1 rounded-xl py-3 text-[14px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: isArmed ? 'var(--danger)' : 'var(--surface-2)',
                color: isArmed ? 'white' : 'var(--fg-muted)',
              }}
            >
              {loading ? 'Deleting…' : 'Delete forever'}
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-sheet-title"
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-5 rounded-t-2xl p-6"
        style={{
          background: 'var(--bg)',
          maxWidth: '480px',
          margin: '0 auto',
          borderTop: '1px solid var(--danger)',
          boxShadow: '0 -24px 60px -10px rgba(0,0,0,0.5)',
          maxHeight: '90svh',
          overflowY: 'auto',
        }}
      >
        {/* Drag handle */}
        <div className="mx-auto h-1 w-10 rounded-full bg-border" />

        <h2
          id="delete-sheet-title"
          className="text-fg"
          style={{ fontSize: 20, fontWeight: 900 }}
        >
          Delete your account?
        </h2>

        <p className="text-[14px] leading-relaxed text-fg-muted">
          <strong style={{ color: 'var(--danger)' }}>
            This can&apos;t be undone.
          </strong>{' '}
          Your handle
          {handle ? (
            <>
              {' '}
              <strong>@{handle}</strong>,
            </>
          ) : (
            ','
          )}{' '}
          email, and plan are deleted. {submissionCount ?? 0} submitted{' '}
          {submissionCount === 1 ? 'price stays' : 'prices stay'} on the public
          record — your name is removed from them.
        </p>

        <div className="flex flex-col gap-1.5">
          <label
            className="text-[13px] font-medium text-fg-muted"
            htmlFor="delete-confirm-sheet"
          >
            Type <strong>DELETE</strong> to confirm.
          </label>
          <input
            ref={inputRef}
            id="delete-confirm-sheet"
            type="text"
            value={inputValue}
            onChange={(evt) => setInputValue(evt.target.value)}
            placeholder={SETTINGS_COPY.dangerZone.deleteConfirmPlaceholder}
            className="rounded-lg border border-border bg-surface-1 px-4 py-3 text-fg placeholder:text-fg-subtle focus:outline-none"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '0.06em',
              ...(isArmed ? { borderColor: 'var(--danger)' } : {}),
            }}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-3 text-[14px] font-bold text-fg"
            style={{ background: 'var(--surface-1)' }}
          >
            Keep my account
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={!isArmed || loading}
            className="flex-1 rounded-xl py-3.5 text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: isArmed ? 'var(--danger)' : 'var(--surface-2)',
              color: isArmed ? 'white' : 'var(--fg-muted)',
            }}
          >
            {loading
              ? 'Deleting…'
              : isArmed
                ? SETTINGS_COPY.dangerZone.deleteButtonArmed
                : SETTINGS_COPY.dangerZone.deleteButtonDisabled}
          </button>
        </div>
      </div>
    </>
  )
}
