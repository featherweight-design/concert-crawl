'use client'

import { useState, useRef, useEffect } from 'react'

interface WaitlistModalProps {
  open: boolean
  onClose: () => void
}

type ModalState = 'idle' | 'submitting' | 'success' | 'error'

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 44,
  padding: '0 14px',
  background: 'var(--surface-1)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontFamily: 'Inter, system-ui',
  fontSize: 15,
  color: 'var(--fg)',
  outline: 'none',
}

export function WaitlistModal({ open, onClose }: WaitlistModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [state, setState] = useState<ModalState>('idle')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && state !== 'success') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, state])

  useEffect(() => {
    if (!open) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setState('submitting')
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
      const res = await fetch(`${apiUrl}/v1/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })
      if (!res.ok) {
        setState('error')
        return
      }
      setState('success')
    } catch {
      setState('error')
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--scrim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={(ev) => ev.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 16,
          padding: '28px 24px 24px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            all: 'unset',
            cursor: 'pointer',
            position: 'absolute',
            top: 14,
            right: 14,
            width: 28,
            height: 28,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg-muted)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16">
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {state === 'success' ? (
          <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                margin: '0 auto',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2
              style={{
                margin: '16px 0 6px',
                fontFamily: 'Inter, system-ui',
                fontWeight: 800,
                fontSize: 22,
                color: 'var(--fg)',
                letterSpacing: '-0.02em',
              }}
            >
              You&apos;re on the list.
            </h2>
            <p
              style={{
                margin: 0,
                fontFamily: 'Inter, system-ui',
                fontSize: 14,
                color: 'var(--fg-muted)',
                lineHeight: 1.45,
                maxWidth: '32ch',
                marginInline: 'auto',
              }}
            >
              We&apos;ll email you the moment a beta slot opens up. Thanks for
              caring about live music.
            </p>
            <button
              onClick={onClose}
              style={{
                all: 'unset',
                cursor: 'pointer',
                marginTop: 22,
                padding: '10px 20px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontFamily: 'Inter, system-ui',
                fontWeight: 600,
                fontSize: 13,
                color: 'var(--fg)',
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: 'var(--signal)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              Waitlist
            </div>
            <h2
              style={{
                margin: '8px 0 6px',
                fontFamily: 'Inter, system-ui',
                fontWeight: 800,
                fontSize: 22,
                color: 'var(--fg)',
                letterSpacing: '-0.02em',
              }}
            >
              Get on the list
            </h2>
            <p
              style={{
                margin: 0,
                fontFamily: 'Inter, system-ui',
                fontSize: 14,
                color: 'var(--fg-muted)',
                lineHeight: 1.45,
              }}
            >
              We&apos;re letting people in slowly. Drop your name and email —
              we&apos;ll ping you when there&apos;s room.
            </p>

            {state === 'error' && (
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 12px',
                  background: 'rgba(255,122,138,0.10)',
                  border: '1px solid var(--danger)',
                  borderRadius: 8,
                  fontFamily: 'Inter, system-ui',
                  fontSize: 13,
                  color: 'var(--danger)',
                }}
              >
                Something went wrong. Try again.
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginTop: 18,
              }}
            >
              <label
                style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: 'var(--fg-muted)',
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  Name
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  placeholder="Jordan Reyes"
                  style={inputStyle}
                />
              </label>
              <label
                style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: 'var(--fg-muted)',
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  Email <span style={{ color: 'var(--accent)' }}>*</span>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="you@email.com"
                  required
                  style={inputStyle}
                />
              </label>
              <button
                type="submit"
                disabled={state === 'submitting'}
                style={{
                  all: 'unset',
                  cursor: state === 'submitting' ? 'not-allowed' : 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 52,
                  borderRadius: 10,
                  background:
                    state === 'submitting'
                      ? 'var(--surface-2)'
                      : 'var(--signal)',
                  color:
                    state === 'submitting'
                      ? 'var(--fg-subtle)'
                      : 'var(--fg-on-accent)',
                  fontFamily: 'Inter, system-ui',
                  fontWeight: 800,
                  fontSize: 16,
                }}
              >
                {state === 'submitting' ? 'Adding you…' : 'Add me to the list'}
              </button>
            </form>

            <p
              style={{
                margin: '14px 0 0',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: 'var(--fg-subtle)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              No spam. We&apos;ll only email when there&apos;s beta access.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
