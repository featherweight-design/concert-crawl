'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { deleteAccount } from '@/lib/users'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const SETTINGS_COPY = CONSUMER_COPY.settings
const DANGER_COPY = SETTINGS_COPY.dangerZone

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
            {DANGER_COPY.confirmHeading}
          </h2>
          <p className="mb-4 text-[13px] leading-relaxed text-fg-muted">
            <strong style={{ color: 'var(--danger)' }}>
              {DANGER_COPY.confirmCantUndo}
            </strong>{' '}
            {DANGER_COPY.confirmBodyLead}
            {handle ? (
              <>
                {' '}
                <strong>@{handle}</strong>,
              </>
            ) : (
              ','
            )}{' '}
            {DANGER_COPY.confirmBodyRest(submissionCount ?? 0)}
          </p>
          <label
            className="mb-1.5 block text-[13px] font-medium text-fg-muted"
            htmlFor="delete-confirm-desktop"
          >
            {DANGER_COPY.confirmLabelLead}{' '}
            <strong>{DANGER_COPY.confirmLabelToken}</strong>{' '}
            {DANGER_COPY.confirmLabelTail}
          </label>
          <input
            ref={inputRef}
            id="delete-confirm-desktop"
            type="text"
            value={inputValue}
            onChange={(evt) => setInputValue(evt.target.value)}
            placeholder={DANGER_COPY.confirmPlaceholderDesktop}
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
              {DANGER_COPY.keepAccountButton}
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
              {loading
                ? DANGER_COPY.deletingButton
                : DANGER_COPY.deleteForeverButton}
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
          {DANGER_COPY.confirmHeading}
        </h2>

        <p className="text-[14px] leading-relaxed text-fg-muted">
          <strong style={{ color: 'var(--danger)' }}>
            {DANGER_COPY.confirmCantUndo}
          </strong>{' '}
          {DANGER_COPY.confirmBodyLead}
          {handle ? (
            <>
              {' '}
              <strong>@{handle}</strong>,
            </>
          ) : (
            ','
          )}{' '}
          {DANGER_COPY.confirmBodyRest(submissionCount ?? 0)}
        </p>

        <div className="flex flex-col gap-1.5">
          <label
            className="text-[13px] font-medium text-fg-muted"
            htmlFor="delete-confirm-sheet"
          >
            {DANGER_COPY.confirmLabelLead}{' '}
            <strong>{DANGER_COPY.confirmLabelToken}</strong>{' '}
            {DANGER_COPY.confirmLabelTail}
          </label>
          <input
            ref={inputRef}
            id="delete-confirm-sheet"
            type="text"
            value={inputValue}
            onChange={(evt) => setInputValue(evt.target.value)}
            placeholder={DANGER_COPY.deleteConfirmPlaceholder}
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
            {DANGER_COPY.keepAccountButton}
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
              ? DANGER_COPY.deletingButton
              : isArmed
                ? DANGER_COPY.deleteButtonArmed
                : DANGER_COPY.deleteButtonDisabled}
          </button>
        </div>
      </div>
    </>
  )
}
