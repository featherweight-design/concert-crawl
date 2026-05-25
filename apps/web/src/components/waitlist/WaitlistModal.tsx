'use client'

import { useState, useRef, useEffect } from 'react'
import { LANDING_COPY } from '@/app/_components/definitions/copy'

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
  const [email, setEmail] = useState('')
  const [state, setState] = useState<ModalState>('idle')
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state and inputs each time the modal opens
  useEffect(() => {
    if (open) {
      setState('idle')
      setEmail('')
    }
  }, [open])

  // Auto-focus the email input when the modal opens (not on success screen)
  useEffect(() => {
    if (!open || state === 'success') return
    const timer = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
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
        body: JSON.stringify({ email }),
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
          aria-label={LANDING_COPY.waitlist.closeButtonAriaLabel}
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
              {LANDING_COPY.waitlist.success.heading}
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
              {LANDING_COPY.waitlist.success.body}
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
              {LANDING_COPY.waitlist.success.closeButton}
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
              {LANDING_COPY.waitlist.form.eyebrow}
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
              {LANDING_COPY.waitlist.form.heading}
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
              {LANDING_COPY.waitlist.form.body}
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
                {LANDING_COPY.waitlist.form.errorMessage}
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
                  {LANDING_COPY.waitlist.form.emailLabel}{' '}
                  <span style={{ color: 'var(--accent)' }}>*</span>
                </span>
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder={LANDING_COPY.waitlist.form.emailPlaceholder}
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
                {state === 'submitting'
                  ? LANDING_COPY.waitlist.form.submittingButton
                  : LANDING_COPY.waitlist.form.submitButton}
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
              {LANDING_COPY.waitlist.form.footerNote}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
