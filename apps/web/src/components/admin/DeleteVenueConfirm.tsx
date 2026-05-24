'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Trash2, Loader2 } from 'lucide-react'
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
}: DeleteVenueConfirmProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typedValue, setTypedValue] = useState('')
  const [deleteState, setDeleteState] = useState<'idle' | 'deleting' | 'error'>(
    'idle',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const trimmed = typedValue.trim()
  const isArmed = trimmed === 'DELETE'
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
            background: 'rgba(0,0,0,0.55)',
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
              width: 480,
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
            <div style={{ padding: '22px 24px 0' }}>
              {/* Eyebrow */}
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--danger)',
                }}
              >
                Destructive action
              </span>

              {/* Title */}
              <h3
                id="delete-venue-title"
                style={{
                  margin: '6px 0 12px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.15,
                  color: 'var(--fg)',
                }}
              >
                Delete {'“'}
                {venueName}
                {'”'}?
              </h3>

              {/* Description */}
              <p
                style={{
                  margin: '0 0 18px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  color: 'var(--fg-muted)',
                  lineHeight: 1.55,
                }}
              >
                This{' '}
                <strong style={{ color: 'var(--danger)', fontWeight: 700 }}>
                  can&rsquo;t be undone
                </strong>
                . The venue config, crawl schedule, and ticketing defaults will
                be removed.
              </p>
            </div>

            {/* What gets removed / survives */}
            <div
              style={{
                padding: '0 24px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--fg-subtle)',
                    marginBottom: 8,
                  }}
                >
                  What gets removed
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  {[
                    'Venue config (name, slug, source URL, ticketing)',
                    'Crawl schedule + extraction strategy + history',
                    'About / Capacity / Neighborhood editorial copy',
                    'Identity art seed',
                  ].map((item) => (
                    <li
                      key={item}
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 13,
                        color: 'var(--fg-muted)',
                        lineHeight: 1.45,
                      }}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--fg-subtle)',
                    marginBottom: 8,
                  }}
                >
                  What survives
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  {[
                    'Individual event records (orphaned, can be re-linked or re-deleted manually)',
                    'Fan-submitted prices and confirmations on those events',
                  ].map((item) => (
                    <li
                      key={item}
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 13,
                        color: 'var(--fg-muted)',
                        lineHeight: 1.45,
                      }}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* DELETE gate */}
            <div style={{ padding: '0 24px 20px' }}>
              <label
                htmlFor="delete-gate-input"
                style={{
                  display: 'block',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--fg-muted)',
                  marginBottom: 10,
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
                to confirm.
              </label>
              <input
                id="delete-gate-input"
                type="text"
                value={typedValue}
                onChange={(evt) => setTypedValue(evt.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                disabled={deleteState === 'deleting'}
                style={{
                  width: '100%',
                  height: 52,
                  padding: '0 16px',
                  border: `1.5px solid ${isArmed ? 'var(--danger)' : 'var(--border-strong)'}`,
                  borderRadius: 10,
                  outline: 'none',
                  background: 'var(--surface-1)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: 'var(--fg)',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.12s',
                }}
              />
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
                Keep venue
              </AdminButton>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={!canDelete}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 36,
                  padding: '0 16px',
                  borderRadius: 8,
                  border: canDelete
                    ? '1px solid var(--danger)'
                    : '1px solid color-mix(in oklab, var(--danger) 30%, transparent)',
                  background: canDelete ? 'var(--danger)' : 'transparent',
                  color: canDelete
                    ? 'var(--fg-on-accent)'
                    : 'color-mix(in oklab, var(--danger) 60%, var(--fg-subtle))',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: canDelete ? 'pointer' : 'not-allowed',
                  transition: 'background 0.12s, border-color 0.12s',
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
                ) : canDelete ? (
                  <>
                    <Trash2 size={13} />
                    Delete permanently
                  </>
                ) : (
                  <>
                    <X size={13} />
                    Type DELETE to enable
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
