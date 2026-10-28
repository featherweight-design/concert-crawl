'use client'

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { AdminButton, AdminDialog } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { removeVenue } from '@/lib/actions/venues'
import type { RemoveVenueControlProps } from './definitions/types'

const COPY = ADMIN_COPY.venueDetailsClient.dangerZone.remove

/**
 * Honours a venue's removal request, the one /bot promises within 30 days.
 * Unlike "Pause venue" it also deletes every price held for the venue's
 * shows, which cannot be undone, so it asks for a reason and the venue's
 * name before it runs.
 */
export const RemoveVenueControl = ({
  venueId,
  venueName,
  removed,
}: RemoveVenueControlProps) => {
  const router = useRouter()
  const reasonId = useId()
  const typedId = useId()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [typed, setTyped] = useState('')
  const [failed, setFailed] = useState(false)
  const [isPending, startTransition] = useTransition()

  const trimmedReason = reason.trim()
  const armed = typed.trim() === venueName.trim() && trimmedReason !== ''

  const close = () => {
    if (isPending) return
    setOpen(false)
    setReason('')
    setTyped('')
    setFailed(false)
  }

  const confirm = () => {
    if (!armed) return
    setFailed(false)
    startTransition(async () => {
      try {
        await removeVenue(venueId, trimmedReason)
        setOpen(false)
        setReason('')
        setTyped('')
        router.refresh()
      } catch {
        setFailed(true)
      }
    })
  }

  const fieldStyle = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--fg)',
    // 16px or iOS Safari zooms the page when the field takes focus.
    fontSize: 16,
  }
  const labelStyle = {
    display: 'block',
    fontSize: 12,
    color: 'var(--fg-muted)',
    marginBottom: 6,
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--fg)',
          }}
        >
          {COPY.title}
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            color: 'var(--fg-muted)',
            marginTop: 2,
            lineHeight: 1.4,
          }}
        >
          {removed ? COPY.removedNote : COPY.description}
        </div>
      </div>
      <AdminButton
        variant="danger"
        size="sm"
        icon={Trash2}
        onClick={() => setOpen(true)}
        type="button"
      >
        {COPY.trigger}
      </AdminButton>

      {open && (
        <AdminDialog
          accent="var(--danger)"
          label={COPY.dialog.heading(venueName)}
          eyebrow={COPY.dialog.eyebrow}
          heading={COPY.dialog.heading(venueName)}
          dismissible={!isPending}
          onDismiss={close}
          footer={
            <>
              <AdminButton
                type="button"
                variant="ghost"
                onClick={close}
                disabled={isPending}
              >
                {COPY.dialog.cancel}
              </AdminButton>
              <AdminButton
                type="button"
                variant="danger"
                onClick={confirm}
                disabled={isPending || !armed}
              >
                {isPending ? COPY.dialog.removing : COPY.dialog.confirm}
              </AdminButton>
            </>
          }
        >
          <p
            style={{
              margin: '12px 0 0',
              fontSize: 13,
              color: 'var(--fg-muted)',
              lineHeight: 1.6,
            }}
          >
            {COPY.dialog.body}
          </p>
          <div style={{ marginTop: 16 }}>
            <label htmlFor={reasonId} style={labelStyle}>
              {COPY.dialog.reasonLabel}
            </label>
            <input
              id={reasonId}
              type="text"
              value={reason}
              maxLength={500}
              placeholder={COPY.dialog.reasonPlaceholder}
              onChange={(event) => setReason(event.target.value)}
              style={fieldStyle}
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <label htmlFor={typedId} style={labelStyle}>
              {COPY.dialog.typedPrompt(venueName)}
            </label>
            <input
              id={typedId}
              type="text"
              value={typed}
              aria-label={COPY.dialog.typedInputAriaLabel}
              onChange={(event) => setTyped(event.target.value)}
              style={fieldStyle}
            />
          </div>
          {failed && (
            <p
              role="alert"
              style={{
                margin: '12px 0 0',
                fontSize: 13,
                color: 'var(--danger)',
              }}
            >
              {COPY.dialog.failed}
            </p>
          )}
        </AdminDialog>
      )}
    </div>
  )
}
