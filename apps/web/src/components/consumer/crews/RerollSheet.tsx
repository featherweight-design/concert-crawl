'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'

import { ModalShell } from '@/components/consumer/modal-shell'
import { CrewPatch } from '@/components/consumer/crew-patch'
import { rerollPatch } from '@/lib/crews'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

interface RerollSheetProps {
  open: boolean
  onClose: () => void
  crewId: string
  patchSalt: number
  onApplied: (patchSalt: number) => void
}

/**
 * Current versus candidate, with an explicit apply. The reroll is crew-wide
 * and everyone sees it, so it never fires on a single tap.
 *
 * The candidate is drawn at `patchSalt + 1` and nowhere else. The server owns
 * the increment and the client never proposes a salt, so any other candidate
 * would be previewing artwork that applying could not produce.
 */
export const RerollSheet = ({
  open,
  onClose,
  crewId,
  patchSalt,
  onApplied,
}: RerollSheetProps) => {
  const { getToken } = useAuth()
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (open) return
    setSaving(false)
    setFailed(false)
  }, [open])

  const onApply = async () => {
    if (saving) return
    setSaving(true)
    setFailed(false)
    try {
      const token = await getToken()
      if (token === null) throw new Error('Not signed in')
      const crew = await rerollPatch(token, crewId)
      onApplied(crew.patchSalt)
      onClose()
    } catch (err) {
      console.error('RerollSheet: could not pull a new patch', err)
      setFailed(true)
      setSaving(false)
    }
  }

  const label: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.14em',
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel={COPY.roster.newPatch}
      sheetHeight="short"
      desktopWidth={480}
    >
      <div className="flex flex-col gap-4 pb-2">
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
          {COPY.roster.newPatch}
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
          {COPY.roster.newPatchBody}
        </p>

        <div className="flex items-center justify-center gap-5">
          <span className="flex flex-col items-center gap-2">
            <span style={{ opacity: 0.45 }}>
              <CrewPatch
                crewId={crewId}
                patchSalt={patchSalt}
                size={76}
                scale="hero"
              />
            </span>
            <span style={{ ...label, color: 'var(--fg-subtle)' }}>
              {COPY.roster.nowEyebrow}
            </span>
          </span>
          <svg
            width="16"
            height="12"
            viewBox="0 0 16 12"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M1 6h14m-4-4l4 4-4 4"
              stroke="var(--fg-subtle)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="flex flex-col items-center gap-2">
            <CrewPatch
              crewId={crewId}
              patchSalt={patchSalt + 1}
              size={76}
              scale="hero"
            />
            <span style={{ ...label, color: 'var(--signal)' }}>
              {COPY.roster.newEyebrow}
            </span>
          </span>
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
            {COPY.confirm.failed}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void onApply()}
            disabled={saving}
            className="flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-lg"
            style={{
              background: 'var(--signal)',
              color: 'var(--fg-on-accent)',
              border: 'none',
              fontFamily: 'var(--font-ui)',
              fontSize: 13.5,
              fontWeight: 700,
            }}
          >
            {saving ? COPY.confirm.working : COPY.roster.newPatchCta}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-lg"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              color: 'var(--fg)',
              fontFamily: 'var(--font-ui)',
              fontSize: 13.5,
              fontWeight: 700,
            }}
          >
            {COPY.roster.newPatchKeep}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
