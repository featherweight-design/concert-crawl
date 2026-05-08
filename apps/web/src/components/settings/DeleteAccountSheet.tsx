'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { deleteAccount } from '@/lib/users'
import { SETTINGS_COPY } from './definitions/copy'

interface DeleteAccountSheetProps {
  open: boolean
  onClose: () => void
}

export function DeleteAccountSheet({ open, onClose }: DeleteAccountSheetProps) {
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  const router = useRouter()

  const isArmed = inputValue === 'DELETE'

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

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-sheet-title"
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-5 rounded-t-2xl p-6"
        style={{ background: 'var(--bg)', maxWidth: '480px', margin: '0 auto' }}
      >
        {/* Drag handle */}
        <div className="mx-auto h-1 w-10 rounded-full bg-border" />

        <h2 id="delete-sheet-title" className="text-[18px] font-bold text-fg">
          {SETTINGS_COPY.dangerZone.deleteSheetTitle}
        </h2>

        <p className="text-[14px] leading-relaxed text-fg-muted">
          {SETTINGS_COPY.dangerZone.deleteSheetBody}
        </p>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(evt) => setInputValue(evt.target.value)}
          placeholder={SETTINGS_COPY.dangerZone.deleteConfirmPlaceholder}
          className="rounded-lg border border-border bg-surface-1 px-4 py-3 text-[14px] text-fg placeholder:text-fg-subtle focus:outline-none"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />

        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={!isArmed || loading}
          className="rounded-xl py-3.5 text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
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
    </>
  )
}
