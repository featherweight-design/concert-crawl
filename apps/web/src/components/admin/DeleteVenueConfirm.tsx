'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { deleteVenue } from '@/lib/actions/venues'
import { AdminButton } from '@/components/admin/primitives'

interface DeleteVenueConfirmProps {
  venueId: string
  venueName: string
  eventsTracked: number
}

export function DeleteVenueConfirm({
  venueId,
  venueName,
  eventsTracked,
}: DeleteVenueConfirmProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typedValue, setTypedValue] = useState('')
  const [deleteState, setDeleteState] = useState<'idle' | 'deleting' | 'error'>(
    'idle',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [inputFocused, setInputFocused] = useState(false)

  const trimmed = typedValue.trim()
  const isArmed = trimmed === 'DELETE'
  const isMismatch = trimmed.length > 0 && !isArmed
  const canDelete = isArmed && deleteState === 'idle'

  function handleClose() {
    if (deleteState === 'deleting') return
    setOpen(false)
    setTypedValue('')
    setDeleteState('idle')
    setErrorMessage(null)
  }

  async function handleDelete() {
    if (!canDelete) return
    setDeleteState('deleting')
    try {
      await deleteVenue(venueId)
      router.push('/admin/venues')
    } catch {
      setDeleteState('error')
      setErrorMessage('Delete failed — please try again')
    }
  }

  return (
    <>
      <AdminButton
        variant="danger"
        size="sm"
        icon={X}
        onClick={() => setOpen(true)}
        type="button"
      >
        Delete venue…
      </AdminButton>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-venue-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={(evt) => {
            if (evt.target === evt.currentTarget) handleClose()
          }}
        >
          <div
            style={{
              width: 520,
              maxWidth: '100%',
              background: 'var(--bg-elevated)',
              border:
                '1px solid color-mix(in oklab, var(--danger) 32%, transparent)',
              borderTop: '3px solid var(--danger)',
              borderRadius: 14,
              boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{ padding: '22px 24px 16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <AlertTriangle size={18} color="var(--danger)" />
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    color: 'var(--danger)',
                  }}
                >
                  Danger zone
                </span>
              </div>
              <h3
                id="delete-venue-title"
                style={{
                  margin: '8px 0 0',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.15,
                  color: 'var(--fg)',
                }}
              >
                Delete &ldquo;{venueName}&rdquo;?
              </h3>
              {eventsTracked > 0 && (
                <p
                  style={{
                    margin: '8px 0 0',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    color: 'var(--fg-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  This will remove the venue and detach{' '}
                  <strong style={{ color: 'var(--fg)' }}>
                    {eventsTracked}
                  </strong>{' '}
                  event{eventsTracked === 1 ? '' : 's'}. This action cannot be
                  undone.
                </p>
              )}
              {eventsTracked === 0 && (
                <p
                  style={{
                    margin: '8px 0 0',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    color: 'var(--fg-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  This will permanently remove the venue. This action cannot be
                  undone.
                </p>
              )}
            </div>

            {/* DELETE gate */}
            <div style={{ padding: '0 24px 20px' }}>
              <label
                htmlFor="delete-gate-input"
                style={{
                  display: 'block',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--fg-muted)',
                  marginBottom: 8,
                }}
              >
                Type{' '}
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 800,
                    color: 'var(--danger)',
                    letterSpacing: '0.08em',
                  }}
                >
                  DELETE
                </span>{' '}
                to confirm
              </label>
              <div
                style={{
                  borderRadius: 10,
                  border: `${isArmed ? '1.5px' : '1px'} solid ${
                    isMismatch
                      ? 'var(--danger)'
                      : isArmed
                        ? 'var(--danger)'
                        : inputFocused
                          ? 'var(--border-strong)'
                          : 'var(--border-strong)'
                  }`,
                  transition: 'border-color 0.12s',
                  overflow: 'hidden',
                }}
              >
                <input
                  id="delete-gate-input"
                  type="text"
                  value={typedValue}
                  onChange={(evt) => setTypedValue(evt.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="DELETE"
                  autoComplete="off"
                  disabled={deleteState === 'deleting'}
                  style={{
                    width: '100%',
                    height: 44,
                    padding: '0 14px',
                    border: 'none',
                    outline: 'none',
                    background: 'var(--surface-1)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: 'var(--fg)',
                    boxSizing: 'border-box' as const,
                  }}
                />
              </div>
              {isMismatch && (
                <p
                  style={{
                    margin: '4px 0 0',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 11,
                    color: 'var(--danger)',
                  }}
                >
                  Type DELETE in all caps to enable deletion
                </p>
              )}
              {errorMessage && (
                <p
                  style={{
                    margin: '8px 0 0',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    color: 'var(--danger)',
                    fontWeight: 600,
                  }}
                >
                  {errorMessage}
                </p>
              )}
            </div>

            {/* Action shelf */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '14px 24px',
                background: 'var(--surface-1)',
                borderTop: '1px solid var(--border)',
              }}
            >
              <AdminButton
                variant="ghost"
                onClick={handleClose}
                disabled={deleteState === 'deleting'}
              >
                Cancel
              </AdminButton>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={!canDelete}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 34,
                  padding: '0 16px',
                  borderRadius: 8,
                  border: canDelete
                    ? '1px solid var(--danger)'
                    : '1px solid var(--border-strong)',
                  letterSpacing: '-0.005em',
                  background: canDelete ? 'var(--danger)' : 'var(--surface-2)',
                  color: canDelete ? 'var(--fg-on-accent)' : 'var(--fg-subtle)',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: canDelete ? 'pointer' : 'not-allowed',
                  transition: 'background 0.12s',
                }}
              >
                {deleteState === 'deleting' ? (
                  <>
                    <Loader2
                      size={13}
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    Delete permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
