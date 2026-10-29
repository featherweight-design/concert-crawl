'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { validateAndSetInviteCode } from './actions'
import { WaitlistModal } from '@/components/waitlist/WaitlistModal'
import { copy } from './definitions/copy'

type ErrorKind =
  | 'invalid_format'
  | 'notfound'
  | 'used'
  | 'expired'
  | 'ratelimit'
  | 'server_error'
  | null

function formatCodeInput(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9-]/g, '')
  if (!clean.startsWith('BETA-')) {
    if ('BETA-'.startsWith(clean)) return clean
    if (clean.startsWith('BETA')) return `BETA-${clean.slice(4)}`
    return clean
  }
  const rest = clean.slice(5).replace(/-/g, '')
  if (rest.length <= 4) return `BETA-${rest}`
  return `BETA-${rest.slice(0, 4)}-${rest.slice(4, 8)}`
}

export default function InviteCodePage() {
  const [code, setCode] = useState('')
  const [errorKind, setErrorKind] = useState<ErrorKind>(null)
  const [isPending, startTransition] = useTransition()
  const [waitlistOpen, setWaitlistOpen] = useState(false)

  const isComplete = /^BETA-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)

  function handleChange(ev: React.ChangeEvent<HTMLInputElement>) {
    setErrorKind(null)
    setCode(formatCodeInput(ev.target.value))
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!isComplete || isPending) return
    // Read at submit time rather than through `useSearchParams`, which would
    // force this page behind a Suspense boundary for a value only the click
    // needs. The middleware attaches `redirect_url` when it bounces an
    // invite-gated route here; the action sanitises it.
    const returnPath = new URLSearchParams(window.location.search).get(
      'redirect_url',
    )
    startTransition(async () => {
      const result = await validateAndSetInviteCode(code, returnPath)
      if (!result.ok) setErrorKind(result.error)
    })
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        color: 'var(--fg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 22px',
        fontFamily: 'Inter, system-ui',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--signal)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {copy.stepLabel}
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: 'Inter, system-ui',
              fontWeight: 900,
              fontSize: 28,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            {copy.heading}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: 'var(--fg-muted)',
              lineHeight: 1.5,
            }}
          >
            {copy.description}{' '}
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: 'var(--fg)',
              }}
            >
              {copy.codeFormat}
            </span>
            .
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="text"
              value={code}
              onChange={handleChange}
              placeholder={copy.input.placeholder}
              maxLength={14}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={isPending}
              aria-label={copy.input.ariaLabel}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                height: 64,
                padding: '0 20px',
                textAlign: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: 'var(--surface-1)',
                border: `1.5px solid ${errorKind ? 'var(--danger)' : isComplete ? 'var(--signal)' : 'var(--border-strong)'}`,
                borderRadius: 12,
                color: 'var(--fg)',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
            />
            {errorKind && (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--danger)',
                  textAlign: 'center',
                  lineHeight: 1.4,
                }}
              >
                {copy.errors[errorKind]}
              </div>
            )}
            {/* No hint on an empty field: the description, the mono format
                line, and the input placeholder all show the format already. */}
            {!errorKind && code.length > 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--fg-subtle)',
                  textAlign: 'center',
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {isComplete
                  ? copy.hint.valid
                  : copy.hint.remaining(14 - code.length)}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!isComplete || isPending}
            style={{
              all: 'unset',
              cursor: !isComplete || isPending ? 'not-allowed' : 'pointer',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 52,
              borderRadius: 10,
              background:
                !isComplete || isPending ? 'var(--surface-2)' : 'var(--signal)',
              color:
                !isComplete || isPending
                  ? 'var(--fg-subtle)'
                  : 'var(--fg-on-accent)',
              fontFamily: 'Inter, system-ui',
              fontWeight: 800,
              fontSize: 16,
              opacity: !isComplete || isPending ? 0.7 : 1,
              transition: 'background 0.15s, opacity 0.15s',
              boxShadow:
                isComplete && !isPending
                  ? '0 12px 32px -12px var(--signal)'
                  : 'none',
            }}
          >
            {isPending ? copy.button.pending : copy.button.idle}
          </button>

          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.5,
              color: 'var(--fg-subtle)',
              textAlign: 'center',
            }}
          >
            {copy.agreement.prefix}
            {/* New tab, like the checkout panel's legal links: navigating away
                in place would throw away the code the visitor has typed. */}
            <Link
              href={copy.agreement.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '6px 0',
                color: 'var(--signal)',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                textDecorationColor:
                  'color-mix(in oklch, var(--signal) 45%, transparent)',
              }}
            >
              {copy.agreement.link}
            </Link>
            .
          </p>
        </form>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => setWaitlistOpen(true)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--fg-muted)',
              textDecoration: 'underline',
              textDecorationColor: 'var(--border-strong)',
            }}
          >
            {copy.footer.waitlist}
          </button>
          <Link
            href="/"
            style={{
              fontSize: 13,
              color: 'var(--fg-subtle)',
              textDecoration: 'none',
            }}
          >
            {copy.footer.back}
          </Link>
        </div>
      </div>

      <WaitlistModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
      />
    </div>
  )
}
