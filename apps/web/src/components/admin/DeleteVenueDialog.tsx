'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@base-ui/react/dialog'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { deleteVenue } from '@/lib/actions/venues'
import { AdminButton } from '@/components/admin/primitives'

interface DeleteVenueDialogProps {
  venueId: string
  venueName: string
  eventsTracked: number
}

export function DeleteVenueDialog({
  venueId,
  venueName,
  eventsTracked,
}: DeleteVenueDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typedName, setTypedName] = useState('')
  const [deleteState, setDeleteState] = useState<'idle' | 'deleting' | 'error'>(
    'idle',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const trimmed = typedName.trim()
  const isMatch = trimmed === venueName
  const isMismatch = trimmed.length > 0 && !isMatch
  const canDelete = isMatch && deleteState === 'idle'

  function handleClose() {
    if (deleteState === 'deleting') return
    setOpen(false)
    setTypedName('')
    setDeleteState('idle')
    setErrorMessage(null)
  }

  async function handleDelete() {
    if (!canDelete) return
    setDeleteState('deleting')
    try {
      const result = await deleteVenue(venueId)
      router.push(
        `/admin/venues?deleted=${encodeURIComponent(venueName)}&detached=${result.eventsDetached}`,
      )
    } catch {
      setErrorMessage('Delete failed. Please try again.')
      setDeleteState('error')
    }
  }

  return (
    <>
      <AdminButton
        variant="danger"
        size="sm"
        icon={Trash2}
        type="button"
        onClick={() => setOpen(true)}
      >
        Delete…
      </AdminButton>

      <Dialog.Root
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) handleClose()
          else setOpen(true)
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 50,
            }}
          />
          <Dialog.Popup
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 51,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <div
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                width: '100%',
                maxWidth: 440,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                fontFamily: "'Inter', sans-serif",
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '20px 24px 16px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 4,
                  }}
                >
                  <AlertTriangle
                    size={16}
                    style={{ color: 'var(--danger)', flexShrink: 0 }}
                  />
                  <Dialog.Title
                    style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--fg)',
                    }}
                  >
                    Delete venue
                  </Dialog.Title>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: 'var(--fg-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  This action cannot be undone.
                </p>
              </div>

              {/* Impact summary */}
              <div style={{ padding: '16px 24px' }}>
                <div
                  style={{
                    background: 'rgba(184,56,26,0.07)',
                    border: '1px solid rgba(184,56,26,0.2)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    fontSize: 13,
                    color: 'var(--fg)',
                    lineHeight: 1.6,
                  }}
                >
                  <strong
                    style={{ display: 'block', marginBottom: 6, fontSize: 12 }}
                  >
                    What will change
                  </strong>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 16,
                      color: 'var(--fg-muted)',
                    }}
                  >
                    <li>
                      <strong style={{ color: 'var(--fg)' }}>
                        {venueName}
                      </strong>{' '}
                      will be permanently deleted
                    </li>
                    <li>
                      {eventsTracked} event
                      {eventsTracked !== 1 ? 's' : ''} will have their venue
                      detached but remain published
                    </li>
                    <li>All crawl history for this venue will be removed</li>
                    <li>
                      The public URL{' '}
                      <code
                        style={{
                          fontSize: 11,
                          background: 'var(--surface-1)',
                          padding: '1px 4px',
                          borderRadius: 3,
                        }}
                      >
                        /v/…
                      </code>{' '}
                      will 404
                    </li>
                  </ul>
                </div>

                {/* Type-to-confirm */}
                <div style={{ marginTop: 16 }}>
                  <label
                    htmlFor="delete-confirm-input"
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--fg-muted)',
                      marginBottom: 6,
                    }}
                  >
                    Type{' '}
                    <strong style={{ color: 'var(--fg)' }}>{venueName}</strong>{' '}
                    to confirm
                  </label>
                  <input
                    id="delete-confirm-input"
                    type="text"
                    value={typedName}
                    onChange={(evt) => {
                      setTypedName(evt.target.value)
                      setErrorMessage(null)
                    }}
                    disabled={deleteState === 'deleting'}
                    placeholder={venueName}
                    autoComplete="off"
                    style={{
                      width: '100%',
                      height: 32,
                      padding: '0 10px',
                      borderRadius: 6,
                      border: `1px solid ${
                        isMatch
                          ? 'var(--success)'
                          : isMismatch
                            ? 'var(--danger)'
                            : 'var(--border)'
                      }`,
                      background: 'var(--bg)',
                      color: 'var(--fg)',
                      fontSize: 13,
                      fontFamily: "'Inter', sans-serif",
                      outline: 'none',
                      boxSizing: 'border-box',
                      opacity: deleteState === 'deleting' ? 0.66 : 1,
                    }}
                  />
                  {isMismatch && (
                    <span
                      style={{
                        display: 'block',
                        marginTop: 4,
                        fontSize: 11,
                        color: 'var(--danger)',
                      }}
                    >
                      Name doesn&apos;t match — check capitalisation
                    </span>
                  )}
                  {isMatch && (
                    <span
                      style={{
                        display: 'block',
                        marginTop: 4,
                        fontSize: 11,
                        color: 'var(--success)',
                      }}
                    >
                      ✓ Name matches — delete is armed
                    </span>
                  )}
                </div>

                {errorMessage && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: '8px 12px',
                      background: 'rgba(184,56,26,0.1)',
                      border: '1px solid rgba(184,56,26,0.25)',
                      borderRadius: 6,
                      fontSize: 13,
                      color: 'var(--danger)',
                    }}
                  >
                    {errorMessage}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '0 24px 20px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                }}
              >
                <Dialog.Close
                  render={
                    <AdminButton
                      variant="ghost"
                      size="sm"
                      type="button"
                      disabled={deleteState === 'deleting'}
                      onClick={handleClose}
                    >
                      Cancel
                    </AdminButton>
                  }
                />
                <AdminButton
                  variant="danger"
                  size="sm"
                  type="button"
                  disabled={!canDelete}
                  onClick={() => void handleDelete()}
                  style={{ minWidth: 80 }}
                >
                  {deleteState === 'deleting' ? (
                    <>
                      <Loader2
                        size={12}
                        style={{ animation: 'spin 1s linear infinite' }}
                      />{' '}
                      Deleting…
                    </>
                  ) : (
                    'Delete venue'
                  )}
                </AdminButton>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
