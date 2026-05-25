'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@base-ui/react/dialog'
import {
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Inbox,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { deleteVenue } from '@/lib/actions/venues'
import { AdminButton, MonoLabel } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

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
  const [inputFocused, setInputFocused] = useState(false)

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
      setErrorMessage(ADMIN_COPY.deleteVenueDialog.errors.deleteFailed)
      setDeleteState('error')
    }
  }

  const inputBorderColor = isMatch
    ? 'color-mix(in oklab, var(--success) 60%, transparent)'
    : isMismatch
      ? 'var(--danger)'
      : inputFocused
        ? 'var(--signal)'
        : 'var(--border-strong)'

  const inputRing = isMatch
    ? '0 0 0 3px color-mix(in oklab, var(--success) 22%, transparent)'
    : isMismatch
      ? '0 0 0 3px color-mix(in oklab, var(--danger) 18%, transparent)'
      : inputFocused
        ? '0 0 0 3px color-mix(in oklab, var(--signal) 22%, transparent)'
        : 'none'

  const consequences = [
    {
      icon: <X size={11} />,
      text: (
        <>
          <b style={{ color: 'var(--fg)' }}>1 venue</b> deleted from{' '}
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: 'var(--fg)',
            }}
          >
            venues
          </span>{' '}
          table.
        </>
      ),
    },
    {
      icon: <Inbox size={11} />,
      text: (
        <>
          <b style={{ color: 'var(--fg)' }}>
            {eventsTracked} event{eventsTracked !== 1 ? 's' : ''}
          </b>{' '}
          will have their{' '}
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: 'var(--fg)',
            }}
          >
            venue_id
          </span>{' '}
          nulled. Events remain published.
        </>
      ),
    },
    {
      icon: <RefreshCw size={11} />,
      text: <>All scheduled crawls for this venue stop immediately.</>,
    },
    {
      icon: <ExternalLink size={11} />,
      text: (
        <>
          Public page at{' '}
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: 'var(--fg)',
            }}
          >
            concertcrawl.app/v/…
          </span>{' '}
          will 404.
        </>
      ),
    },
  ]

  return (
    <>
      <AdminButton
        variant="danger"
        size="sm"
        icon={Trash2}
        type="button"
        onClick={() => setOpen(true)}
      >
        {ADMIN_COPY.deleteVenueDialog.trigger}
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
                border:
                  '1px solid color-mix(in oklab, var(--danger) 30%, var(--border))',
                borderRadius: 14,
                width: '100%',
                maxWidth: 520,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                fontFamily: "'Inter', sans-serif",
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '20px 22px 16px',
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background:
                      'color-mix(in oklab, var(--danger) 14%, transparent)',
                    border:
                      '1px solid color-mix(in oklab, var(--danger) 40%, transparent)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={18} color="var(--danger)" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <MonoLabel color="var(--danger)">
                    {ADMIN_COPY.deleteVenueDialog.header.dangerLabel}
                  </MonoLabel>
                  <Dialog.Title
                    style={{
                      margin: '4px 0 0',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 20,
                      fontWeight: 700,
                      color: 'var(--fg)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Delete {venueName}?
                  </Dialog.Title>
                </div>
              </div>

              {/* Consequences */}
              <div style={{ padding: '16px 22px 4px' }}>
                <p
                  style={{
                    margin: '0 0 14px',
                    fontSize: 13,
                    color: 'var(--fg-muted)',
                    lineHeight: 1.55,
                  }}
                >
                  {ADMIN_COPY.deleteVenueDialog.body.description}
                </p>
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {consequences.map((row, idx) => (
                    <li
                      key={idx}
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                        fontSize: 12.5,
                        color: 'var(--fg-muted)',
                        lineHeight: 1.5,
                      }}
                    >
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: 'var(--surface-1)',
                          border: '1px solid var(--border)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: 'var(--fg-subtle)',
                        }}
                      >
                        {row.icon}
                      </span>
                      <span>{row.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Confirmation input */}
              <div style={{ padding: '16px 22px 4px' }}>
                <label
                  htmlFor="delete-confirm-input"
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--fg)',
                    letterSpacing: '-0.005em',
                    marginBottom: 6,
                  }}
                >
                  {ADMIN_COPY.deleteVenueDialog.confirmInput.labelPrefix}{' '}
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: 'var(--fg)',
                      background: 'var(--surface-2)',
                      padding: '1px 6px',
                      borderRadius: 4,
                      fontSize: 11.5,
                    }}
                  >
                    {venueName}
                  </span>{' '}
                  {ADMIN_COPY.deleteVenueDialog.confirmInput.labelSuffix}
                </label>
                <input
                  id="delete-confirm-input"
                  type="text"
                  value={typedName}
                  onChange={(evt) => {
                    setTypedName(evt.target.value)
                    setErrorMessage(null)
                  }}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  disabled={deleteState === 'deleting'}
                  placeholder={venueName}
                  autoComplete="off"
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 10px',
                    borderRadius: 8,
                    border: `1px solid ${inputBorderColor}`,
                    background: 'var(--bg-elevated)',
                    color: 'var(--fg)',
                    fontSize: 13.5,
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: deleteState === 'deleting' ? 0.66 : 1,
                    boxShadow: inputRing,
                    transition: 'border-color .12s, box-shadow .12s',
                  }}
                />
                {isMatch && (
                  <span
                    style={{
                      display: 'block',
                      marginTop: 4,
                      fontSize: 11,
                      color: 'var(--success)',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {ADMIN_COPY.deleteVenueDialog.confirmInput.matchMessage}
                  </span>
                )}
                {isMismatch && (
                  <span
                    style={{
                      display: 'block',
                      marginTop: 4,
                      fontSize: 11,
                      color: 'var(--danger)',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {ADMIN_COPY.deleteVenueDialog.confirmInput.mismatchPrefix}{' '}
                    &ldquo;{venueName}&rdquo;
                    {ADMIN_COPY.deleteVenueDialog.confirmInput.mismatchSuffix}
                  </span>
                )}
                {errorMessage && (
                  <div
                    style={{
                      marginTop: 8,
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 22px',
                  marginTop: 16,
                  borderTop: '1px solid var(--border)',
                  background:
                    'color-mix(in oklab, var(--danger) 5%, var(--surface-1))',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 11.5,
                    color: 'var(--fg-subtle)',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <kbd
                    style={{
                      display: 'inline-block',
                      padding: '1px 5px',
                      borderRadius: 4,
                      border: '1px solid var(--border)',
                      background: 'var(--surface-1)',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      color: 'var(--fg-muted)',
                    }}
                  >
                    Esc
                  </kbd>{' '}
                  {ADMIN_COPY.deleteVenueDialog.footer.escCancel}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Dialog.Close
                    render={
                      <AdminButton
                        variant="ghost"
                        size="sm"
                        type="button"
                        disabled={deleteState === 'deleting'}
                        onClick={handleClose}
                      >
                        {ADMIN_COPY.deleteVenueDialog.footer.cancelButton}
                      </AdminButton>
                    }
                  />
                  <AdminButton
                    variant="danger"
                    size="sm"
                    icon={deleteState === 'deleting' ? Loader2 : AlertTriangle}
                    type="button"
                    disabled={!canDelete}
                    onClick={() => void handleDelete()}
                  >
                    {deleteState === 'deleting'
                      ? ADMIN_COPY.deleteVenueDialog.footer.deleteButtonPending
                      : ADMIN_COPY.deleteVenueDialog.footer.deleteButtonIdle}
                  </AdminButton>
                </div>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
