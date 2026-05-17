'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'
import { useTheme } from '@/theme/ThemeProvider'
import { CCMark } from '@/components/brand/cc-mark'

type FeedbackCategory = 'bug' | 'idea' | 'praise' | 'other'
type ModalState = 'form' | 'loading' | 'success' | 'error'

const CATEGORIES: { key: FeedbackCategory; label: string }[] = [
  { key: 'bug', label: 'Bug' },
  { key: 'idea', label: 'Idea' },
  { key: 'praise', label: 'Praise' },
  { key: 'other', label: 'Other' },
]

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? ''
const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'dev'

interface FeedbackModalProps {
  open: boolean
  onClose: () => void
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const pathname = usePathname()
  const { theme } = useTheme()
  const { getToken } = useAuth()
  const { user } = useUser()
  const userEmail = user?.emailAddresses[0]?.emailAddress ?? 'anonymous'
  const [state, setState] = useState<ModalState>('form')
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [message, setMessage] = useState('')
  const [catError, setCatError] = useState(false)
  const [msgError, setMsgError] = useState(false)
  const [screenshot, setScreenshot] = useState<{
    name: string
    dataUrl: string
  } | null>(null)

  const handleScreenshotChange = useCallback((file: File | null) => {
    if (!file) {
      setScreenshot(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setScreenshot({ name: file.name, dataUrl: reader.result as string })
    }
    reader.readAsDataURL(file)
  }, [])

  const reset = useCallback(() => {
    setState('form')
    setCategory(null)
    setMessage('')
    setCatError(false)
    setMsgError(false)
    setScreenshot(null)
  }, [])

  const handleClose = useCallback(() => {
    onClose()
    setTimeout(reset, 300)
  }, [onClose, reset])

  const handleSubmit = useCallback(async () => {
    const catInvalid = !category
    const msgInvalid = !message.trim()
    if (catInvalid || msgInvalid) {
      setCatError(catInvalid)
      setMsgError(msgInvalid)
      return
    }

    setState('loading')

    const token = await getToken()
    if (!token) {
      setState('error')
      return
    }

    const device =
      typeof navigator !== 'undefined'
        ? navigator.userAgent.slice(0, 120)
        : 'unknown'

    try {
      const res = await fetch(`${API_URL}/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          message: message.trim(),
          pageUrl: pathname,
          metadata: {
            theme,
            build: APP_VERSION,
            device,
            screenshot: screenshot?.dataUrl ?? null,
          },
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setState('success')
    } catch (err) {
      console.error('Feedback submission failed', err)
      setState('error')
    }
  }, [category, getToken, message, pathname, screenshot, theme])

  const handleCategoryChange = useCallback((cat: FeedbackCategory) => {
    setCategory(cat)
    setCatError(false)
  }, [])

  const handleMessageChange = useCallback((msg: string) => {
    setMessage(msg)
    setMsgError(false)
  }, [])

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)')
    setIsMobile(mql.matches)
    const handler = (ev: MediaQueryListEvent) => setIsMobile(ev.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleClose])

  if (!open) return null

  const ctxData: CtxData = {
    route: pathname,
    theme,
    build: APP_VERSION,
    device:
      typeof navigator !== 'undefined'
        ? navigator.userAgent.slice(0, 120)
        : 'unknown',
    user: userEmail,
  }

  return (
    <>
      {/* Scrim */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
          background: 'var(--scrim)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={handleClose}
      />

      {/* Sheet (mobile) / Card (desktop) */}
      {isMobile ? (
        <MobileSheet
          state={state}
          category={category}
          setCategory={handleCategoryChange}
          message={message}
          setMessage={handleMessageChange}
          catError={catError}
          msgError={msgError}
          ctxData={ctxData}
          screenshot={screenshot}
          onScreenshotChange={handleScreenshotChange}
          onSubmit={handleSubmit}
          onClose={handleClose}
          onReset={reset}
        />
      ) : (
        <DesktopCard
          state={state}
          category={category}
          setCategory={handleCategoryChange}
          message={message}
          setMessage={handleMessageChange}
          catError={catError}
          msgError={msgError}
          ctxData={ctxData}
          screenshot={screenshot}
          onScreenshotChange={handleScreenshotChange}
          onSubmit={handleSubmit}
          onClose={handleClose}
          onReset={reset}
        />
      )}
    </>
  )
}

// ── Shared form fields ─────────────────────────────────────────────────────

interface CtxData {
  route: string
  theme: string
  build: string
  device: string
  user: string
}

interface ScreenshotValue {
  name: string
  dataUrl: string
}

interface FormProps {
  state: ModalState
  category: FeedbackCategory | null
  setCategory: (cat: FeedbackCategory) => void
  message: string
  setMessage: (msg: string) => void
  catError: boolean
  msgError: boolean
  ctxData: CtxData
  screenshot: ScreenshotValue | null
  onScreenshotChange: (file: File | null) => void
}

function FormFields({
  state,
  category,
  setCategory,
  message,
  setMessage,
  catError,
  msgError,
  ctxData,
  screenshot,
  onScreenshotChange,
}: FormProps) {
  const disabled = state === 'loading'
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-ui)',
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: '-0.035em',
            lineHeight: 1.0,
            color: 'var(--fg)',
            textWrap: 'balance',
          }}
        >
          Holler at us.
        </h2>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--fg-muted)',
            letterSpacing: '-0.005em',
            textWrap: 'pretty',
          }}
        >
          Bug, idea, or praise. We read all of it — usually within a couple
          days.
        </p>
      </div>

      {/* Category chips */}
      <div>
        <Eyebrow error={catError}>What kind?</Eyebrow>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            opacity: disabled ? 0.55 : 1,
          }}
        >
          {CATEGORIES.map((cat) => {
            const active = category === cat.key
            return (
              <button
                key={cat.key}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => setCategory(cat.key)}
                style={{
                  all: 'unset',
                  cursor: disabled ? 'default' : 'pointer',
                  padding: '7px 12px',
                  borderRadius: 999,
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 700,
                  fontSize: 12.5,
                  letterSpacing: '-0.005em',
                  background: active ? 'var(--signal)' : 'transparent',
                  color: active ? 'var(--fg-on-accent)' : 'var(--fg)',
                  border: `1.5px solid ${
                    active
                      ? 'var(--signal)'
                      : catError
                        ? 'var(--warning)'
                        : 'var(--border-strong)'
                  }`,
                  transition: 'background .12s, color .12s, border-color .12s',
                }}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
        {catError && (
          <HelpText tone="error">
            Pick a vibe so we know how to read this.
          </HelpText>
        )}
      </div>

      {/* Message */}
      <div>
        <Eyebrow error={msgError}>What&apos;s up?</Eyebrow>
        <textarea
          className="fb-textarea"
          value={message}
          onChange={(ev) => setMessage(ev.target.value)}
          disabled={disabled}
          rows={5}
          placeholder="What did you see? What did you expect? Anything that helps us reproduce it."
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '12px 14px',
            background: 'var(--surface-1)',
            color: 'var(--fg)',
            border: `1px solid ${msgError ? 'var(--warning)' : 'var(--border-strong)'}`,
            borderRadius: 10,
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            lineHeight: 1.5,
            letterSpacing: '-0.005em',
            resize: 'vertical',
            outline: 'none',
            opacity: disabled ? 0.6 : 1,
            transition: 'border-color .12s',
          }}
        />
        {msgError && (
          <HelpText tone="error">
            Don&apos;t leave us hanging — give us a sentence.
          </HelpText>
        )}
      </div>

      {/* Screenshot attachment */}
      <div>
        <Eyebrow>Proof (optional)</Eyebrow>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          disabled={disabled}
          onChange={(ev) => {
            onScreenshotChange(ev.target.files?.[0] ?? null)
          }}
        />
        {screenshot ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              border: '1.5px solid var(--border-strong)',
              borderRadius: 10,
              background: 'var(--surface-1)',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  'color-mix(in oklab, var(--signal) 14%, transparent)',
                color: 'var(--signal)',
                flexShrink: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 8l3 3 5-5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span
              style={{
                flex: 1,
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--fg)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {screenshot.name}
            </span>
            <button
              type="button"
              disabled={disabled}
              aria-label="Remove screenshot"
              onClick={() => {
                onScreenshotChange(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              style={{
                all: 'unset',
                cursor: disabled ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: 5,
                color: 'var(--fg-subtle)',
                flexShrink: 0,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 2l8 8M10 2l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            style={{
              all: 'unset',
              cursor: disabled ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px 14px',
              border: '1.5px dashed var(--border-strong)',
              borderRadius: 10,
              color: 'var(--fg-muted)',
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '-0.005em',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--surface-2)',
                color: 'var(--signal)',
                flexShrink: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect
                  x="2"
                  y="3.5"
                  width="12"
                  height="9"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <circle
                  cx="8"
                  cy="8"
                  r="2.2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M5.5 3.5l1-1.2h3l1 1.2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 1,
              }}
            >
              <span
                style={{ color: 'var(--fg)', fontSize: 13, fontWeight: 700 }}
              >
                Attach a screenshot
              </span>
              <span
                style={{
                  color: 'var(--fg-subtle)',
                  fontSize: 11.5,
                  fontWeight: 500,
                  letterSpacing: 0,
                }}
              >
                Optional · helps a lot
              </span>
            </span>
          </button>
        )}
      </div>

      <ContextDisclosure ctx={ctxData} />
    </div>
  )
}

// ── Status states ─────────────────────────────────────────────────────────

function SuccessState({
  onClose,
  onReset,
}: {
  onClose: () => void
  onReset: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '8px 0',
      }}
    >
      <StatusRail tone="success" />
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          lineHeight: 1.0,
          color: 'var(--fg)',
          textWrap: 'balance',
        }}
      >
        Loud and clear.
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
          textWrap: 'pretty',
        }}
      >
        Your message is in the queue. We read everything — Hugh especially.
        Don&apos;t expect a reply unless we need more from you.
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginTop: 4,
        }}
      >
        <SubmitButton onClick={onClose}>Back to the show</SubmitButton>
        <SecondaryButton onClick={onReset}>Send another</SecondaryButton>
      </div>
    </div>
  )
}

function ErrorState({
  onReset,
  onClose,
}: {
  onReset: () => void
  onClose: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '8px 0',
      }}
    >
      <StatusRail tone="error" />
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          lineHeight: 1.0,
          color: 'var(--fg)',
          textWrap: 'balance',
        }}
      >
        Signal lost.
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
          textWrap: 'pretty',
        }}
      >
        We couldn&apos;t push that to the queue just now. Your message is saved
        on this device — try again in a sec, or send it later.
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginTop: 4,
        }}
      >
        <SubmitButton onClick={onReset}>Try again</SubmitButton>
        <SecondaryButton onClick={onClose}>Save and come back</SecondaryButton>
      </div>
    </div>
  )
}

// ── Mobile sheet ──────────────────────────────────────────────────────────

interface ShellProps extends FormProps {
  onSubmit: () => void
  onClose: () => void
  onReset: () => void
}

function MobileSheet({
  state,
  onSubmit,
  onClose,
  onReset,
  ...formProps
}: ShellProps) {
  const showForm = state === 'form' || state === 'loading'
  const sheetHeight = state === 'success' || state === 'error' ? '62%' : '85%'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Feedback"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: sheetHeight,
        zIndex: 100,
        background: 'var(--bg-elevated)',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        boxShadow: '0 -16px 48px rgba(0,0,0,0.45)',
        border: '1px solid var(--border)',
        borderBottom: 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Drag handle */}
      <div
        style={{
          flexShrink: 0,
          height: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'var(--border-strong)',
          }}
        />
      </div>

      {/* Header rail */}
      <div
        style={{
          flexShrink: 0,
          padding: '0 18px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <CCMark size={20} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <HeaderRail state={state} />
        </div>
        <button
          type="button"
          aria-label="Close feedback"
          onClick={onClose}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 28,
            height: 28,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg-muted)',
            border: '1px solid var(--border)',
          }}
        >
          <CloseIcon />
        </button>
      </div>

      {/* Scroll area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '6px 18px 18px',
          opacity: state === 'loading' ? 0.5 : 1,
          pointerEvents: state === 'loading' ? 'none' : 'auto',
        }}
      >
        {state === 'success' && (
          <SuccessState onClose={onClose} onReset={onReset} />
        )}
        {state === 'error' && (
          <ErrorState onReset={onReset} onClose={onClose} />
        )}
        {showForm && <FormFields state={state} {...formProps} />}
      </div>

      {/* Sticky footer */}
      {showForm && (
        <div
          style={{
            flexShrink: 0,
            padding: '12px 18px 22px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
          }}
        >
          <SubmitButton loading={state === 'loading'} onClick={onSubmit}>
            Send →
          </SubmitButton>
        </div>
      )}
    </div>
  )
}

// ── Desktop card ──────────────────────────────────────────────────────────

function DesktopCard({
  state,
  onSubmit,
  onClose,
  onReset,
  ...formProps
}: ShellProps) {
  const showForm = state === 'form' || state === 'loading'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Feedback"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 100,
        width: 520,
        maxWidth: 'calc(100% - 64px)',
        maxHeight: 'calc(100% - 80px)',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 16,
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          padding: '18px 22px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <CCMark size={22} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <HeaderRail state={state} />
        </div>
        <button
          type="button"
          aria-label="Close feedback"
          onClick={onClose}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 30,
            height: 30,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg-muted)',
            border: '1px solid var(--border)',
          }}
        >
          <CloseIcon />
        </button>
      </div>

      {/* Scroll area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '18px 22px',
          opacity: state === 'loading' ? 0.5 : 1,
          pointerEvents: state === 'loading' ? 'none' : 'auto',
        }}
      >
        {state === 'success' && (
          <SuccessState onClose={onClose} onReset={onReset} />
        )}
        {state === 'error' && (
          <ErrorState onReset={onReset} onClose={onClose} />
        )}
        {showForm && <FormFields state={state} {...formProps} />}
      </div>

      {/* Footer */}
      {showForm && (
        <div
          style={{
            flexShrink: 0,
            padding: '14px 22px 18px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <SecondaryButton onClick={onClose} fullWidth={false}>
            Cancel
          </SecondaryButton>
          <div style={{ width: 200 }}>
            <SubmitButton loading={state === 'loading'} onClick={onSubmit}>
              Send →
            </SubmitButton>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Context disclosure ────────────────────────────────────────────────────

function ContextDisclosure({ ctx }: { ctx: CtxData }) {
  const [open, setOpen] = useState(false)
  const rows: { key: string; value: string }[] = [
    { key: 'Route', value: ctx.route },
    { key: 'Theme', value: ctx.theme },
    { key: 'Build', value: ctx.build },
    { key: 'Device', value: ctx.device },
    { key: 'User', value: ctx.user },
  ]
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: 'var(--surface-1)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
        }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          style={{
            color: 'var(--fg-muted)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform .15s',
            flexShrink: 0,
          }}
        >
          <path
            d="M2 4l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--fg-muted)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Auto-attached · what we&apos;ll send
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.10em',
          }}
        >
          5 fields
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: '4px 12px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            borderTop: '1px solid var(--border)',
          }}
        >
          {rows.map((row) => (
            <div
              key={row.key}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr',
                gap: 10,
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--fg-subtle)',
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                }}
              >
                {row.key}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--fg)',
                  letterSpacing: '0.01em',
                  wordBreak: 'break-all',
                  lineHeight: 1.4,
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Primitive atoms ───────────────────────────────────────────────────────

function Eyebrow({
  children,
  error = false,
}: {
  children: React.ReactNode
  error?: boolean
}) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        color: error ? 'var(--warning)' : 'var(--fg-subtle)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}

function HelpText({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode
  tone?: 'muted' | 'error'
}) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: tone === 'error' ? 'var(--warning)' : 'var(--fg-subtle)',
        marginTop: 6,
        lineHeight: 1.4,
        letterSpacing: '-0.005em',
      }}
    >
      {children}
    </div>
  )
}

function HeaderRail({ state }: { state: ModalState }) {
  const isError = state === 'error'
  const isSuccess = state === 'success'
  const accent = isError
    ? 'var(--warning)'
    : isSuccess
      ? 'var(--signal)'
      : 'var(--accent)'
  const eyebrow = isError
    ? 'Beta channel · stalled'
    : isSuccess
      ? 'Got it · beta channel'
      : 'Beta channel · always open'
  const code = isError ? 'ERR' : isSuccess ? 'SENT' : 'OPEN'
  const pulse = state === 'form' || state === 'loading'

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 6,
          background: accent,
          flexShrink: 0,
          boxShadow: pulse ? `0 0 8px ${accent}` : 'none',
          animation: pulse ? 'fbPulse 1.6s ease-in-out infinite' : 'none',
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: accent,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {eyebrow}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        {code}
      </span>
    </div>
  )
}

function StatusRail({ tone }: { tone: 'success' | 'error' }) {
  const accent = tone === 'success' ? 'var(--signal)' : 'var(--warning)'
  const label =
    tone === 'success' ? 'Got it · beta channel' : "Didn't send · beta channel"
  const code = tone === 'success' ? '200 · OK' : 'ERR · 503'
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 6,
          background: accent,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: accent,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        {code}
      </span>
    </div>
  )
}

function SubmitButton({
  children,
  onClick,
  loading = false,
}: {
  children: React.ReactNode
  onClick: () => void
  loading?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        all: 'unset',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 48,
        width: '100%',
        boxSizing: 'border-box',
        background: 'var(--signal)',
        color: 'var(--fg-on-accent)',
        borderRadius: 10,
        fontFamily: 'var(--font-ui)',
        fontWeight: 800,
        fontSize: 14.5,
        letterSpacing: '-0.005em',
        boxShadow: loading ? 'none' : '0 12px 32px -16px var(--signal)',
        opacity: loading ? 0.55 : 1,
        transition: 'opacity .12s, transform .12s',
      }}
    >
      {loading && <Spinner />}
      <span>{loading ? 'Sending…' : children}</span>
    </button>
  )
}

function SecondaryButton({
  children,
  onClick,
  fullWidth = true,
}: {
  children: React.ReactNode
  onClick: () => void
  fullWidth?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: fullWidth ? '100%' : 'auto',
        boxSizing: 'border-box',
        height: 44,
        padding: '0 16px',
        borderRadius: 10,
        color: 'var(--fg-muted)',
        fontFamily: 'var(--font-ui)',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '-0.005em',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        border: '1.6px solid currentColor',
        borderTopColor: 'transparent',
        animation: 'fbSpin 0.8s linear infinite',
      }}
    />
  )
}

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 2l8 8M10 2l-8 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
