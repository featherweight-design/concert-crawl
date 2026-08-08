'use client'

// Renaming a crew. Keeper-only, and the counterpart to RerollSheet: that one
// changes the artwork and never the name, this one changes the name and never
// the artwork. Neither can reach the other's field, which is what keeps the
// "renaming won't change the patch" promise true rather than merely stated.

import { useEffect, useId, useState } from 'react'
import { useAuth } from '@clerk/nextjs'

import { ModalShell } from '@/components/consumer/modal-shell'
import { renameCrew } from '@/lib/crews'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

interface RenameSheetProps {
  open: boolean
  onClose: () => void
  crewId: string
  crewName: string
  onRenamed: (name: string) => void
}

export const RenameSheet = ({
  open,
  onClose,
  crewId,
  crewName,
  onRenamed,
}: RenameSheetProps) => {
  const { getToken } = useAuth()
  const nameId = useId()
  const [name, setName] = useState(crewName)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  // Reseeded on open rather than on `crewName` changing: a rename that is
  // still in flight would otherwise have the field yanked out from under the
  // typist by the refetch that lands behind it.
  useEffect(() => {
    if (!open) return
    setName(crewName)
    setSaving(false)
    setFailed(false)
  }, [open, crewName])

  const trimmed = name.trim()
  const canSubmit = trimmed !== '' && trimmed !== crewName && !saving

  const onSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setFailed(false)
    try {
      const token = await getToken()
      if (token === null) throw new Error('Not signed in')
      const crew = await renameCrew(token, crewId, trimmed)
      onRenamed(crew.name)
      onClose()
    } catch (err) {
      console.error('RenameSheet: could not rename crew', err)
      setFailed(true)
      setSaving(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel={COPY.rename.title}
      sheetHeight="short"
      desktopWidth={460}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4 pb-2">
        <div className="flex flex-col gap-1.5">
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: 19,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
            }}
          >
            {COPY.rename.title}
          </h2>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: 13.5,
              lineHeight: 1.5,
              color: 'var(--fg-muted)',
            }}
          >
            {COPY.rename.sub}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={nameId}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--fg-subtle)',
            }}
          >
            {COPY.create.nameLabel}
          </label>
          <input
            id={nameId}
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            placeholder={COPY.create.namePlace}
            // Mirrors the API's nameSchema, exactly as the create sheet does.
            maxLength={40}
            autoComplete="off"
            className="crew-name-input"
            style={{
              minHeight: 44,
              padding: '0 12px',
              borderRadius: 10,
              background: 'var(--surface-1)',
              border: '1px solid var(--border-strong)',
              color: 'var(--fg)',
              fontFamily: 'var(--font-ui)',
              fontSize: 15,
              fontWeight: 600,
            }}
          />
        </div>

        {failed && (
          <p
            role="alert"
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--warning)',
            }}
          >
            {COPY.rename.failed}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-lg disabled:cursor-default"
          style={{
            background: canSubmit ? 'var(--signal)' : 'var(--surface-2)',
            color: canSubmit ? 'var(--fg-on-accent)' : 'var(--fg-subtle)',
            border: 'none',
            fontFamily: 'var(--font-ui)',
            fontSize: 13.5,
            fontWeight: 700,
          }}
        >
          {saving ? COPY.rename.submitting : COPY.rename.submit}
        </button>
      </form>
    </ModalShell>
  )
}
