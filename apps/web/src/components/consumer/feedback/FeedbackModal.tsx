'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { usePathname } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'
import { useTheme } from '@/theme/ThemeProvider'
import { CCMark } from '@/components/brand/cc-mark'
import { ModalShell } from '@/components/consumer/modal-shell'
import { clearDraft, loadDraft, saveDraft } from '@/lib/feedback-draft'

type FeedbackCategory = 'bug' | 'idea' | 'praise' | 'other'
type ModalState = 'form' | 'loading' | 'success' | 'error'

const CATEGORIES: { key: FeedbackCategory; label: string }[] = [
  { key: 'bug', label: CONSUMER_COPY.feedback.modal.categories.bug },
  { key: 'idea', label: CONSUMER_COPY.feedback.modal.categories.idea },
  { key: 'praise', label: CONSUMER_COPY.feedback.modal.categories.praise },
  { key: 'other', label: CONSUMER_COPY.feedback.modal.categories.other },
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
  // Banner shown when a previously-saved draft was rehydrated on open.
  // User can dismiss via "Discard draft" which also clears localStorage.
  const [draftRestored, setDraftRestored] = useState(false)
  const prevOpenRef = useRef(false)

  // Hydrate from a saved draft whenever the modal opens (false→true).
  // This is the only place we read from localStorage so we don't fight
  // with the user's in-progress typing.
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current
    prevOpenRef.current = open
    if (!justOpened) return
    const draft = loadDraft()
    if (!draft) return
    setCategory(draft.category)
    setMessage(draft.message)
    setScreenshot(draft.screenshot)
    setCatError(false)
    setMsgError(false)
    setDraftRestored(true)
    // If the modal was previously closed mid-error/success, ensure we
    // land back on the form when rehydrating so the user sees the draft.
    setState('form')
  }, [open])

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
    setDraftRestored(false)
  }, [])

  // Issue #829: return from the error state back to the form WITHOUT
  // wiping category/message/screenshot so the user can correct + retry.
  const returnToForm = useCallback(() => {
    setState('form')
  }, [])

  const handleClose = useCallback(() => {
    onClose()
    setTimeout(reset, 300)
  }, [onClose, reset])

  // Issue #830: "Save and come back" — persist the current draft to
  // localStorage, then close. Reopening the modal will rehydrate it.
  const saveAndCloseLater = useCallback(() => {
    saveDraft({ category, message, screenshot })
    handleClose()
  }, [category, handleClose, message, screenshot])

  const discardDraft = useCallback(() => {
    clearDraft()
    setDraftRestored(false)
    setCategory(null)
    setMessage('')
    setScreenshot(null)
    setCatError(false)
    setMsgError(false)
  }, [])

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
            screenshot: screenshot?.dataUrl,
          },
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      // Successful submission invalidates any saved draft.
      clearDraft()
      setDraftRestored(false)
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

  const showForm = state === 'form' || state === 'loading'
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

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <CCMark size={22} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <HeaderRail state={state} />
      </div>
      <button
        type="button"
        aria-label={CONSUMER_COPY.feedback.modal.closeAriaLabel}
        onClick={handleClose}
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
  )

  const footer = showForm ? (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
      <SecondaryButton onClick={handleClose} fullWidth={false}>
        {CONSUMER_COPY.feedback.modal.footer.cancel}
      </SecondaryButton>
      <div style={{ width: 200 }}>
        <SubmitButton loading={state === 'loading'} onClick={handleSubmit}>
          {CONSUMER_COPY.feedback.modal.footer.submit}
        </SubmitButton>
      </div>
    </div>
  ) : undefined

  const mobileFooter = showForm ? (
    <SubmitButton loading={state === 'loading'} onClick={handleSubmit}>
      {CONSUMER_COPY.feedback.modal.footer.submit}
    </SubmitButton>
  ) : undefined

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      ariaLabel={CONSUMER_COPY.feedback.modal.ariaLabel}
      sheetHeight={state === 'success' || state === 'error' ? 'short' : 'tall'}
      header={header}
      footer={footer}
      mobileFooter={mobileFooter}
    >
      <div
        style={{
          opacity: state === 'loading' ? 0.5 : 1,
          pointerEvents: state === 'loading' ? 'none' : 'auto',
        }}
      >
        {state === 'success' && (
          <SuccessState onClose={handleClose} onReset={reset} />
        )}
        {state === 'error' && (
          <ErrorState
            onRetry={returnToForm}
            onSaveForLater={saveAndCloseLater}
          />
        )}
        {showForm && (
          <FormFields
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
            draftRestored={draftRestored}
            onDiscardDraft={discardDraft}
          />
        )}
      </div>
    </ModalShell>
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
  draftRestored: boolean
  onDiscardDraft: () => void
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
  draftRestored,
  onDiscardDraft,
}: FormProps) {
  const disabled = state === 'loading'
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {draftRestored && (
        <DraftRestoredBanner onDiscard={onDiscardDraft} disabled={disabled} />
      )}
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
          {CONSUMER_COPY.feedback.modal.form.heading}
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
          {CONSUMER_COPY.feedback.modal.form.subheading}
        </p>
      </div>

      {/* Category chips */}
      <div>
        <Eyebrow error={catError}>
          {CONSUMER_COPY.feedback.modal.form.categoryEyebrow}
        </Eyebrow>
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
            {CONSUMER_COPY.feedback.modal.errors.categoryRequired}
          </HelpText>
        )}
      </div>

      {/* Message */}
      <div>
        <Eyebrow error={msgError}>
          {CONSUMER_COPY.feedback.modal.form.messageEyebrow}
        </Eyebrow>
        <textarea
          className="fb-textarea"
          value={message}
          onChange={(ev) => setMessage(ev.target.value)}
          disabled={disabled}
          rows={5}
          placeholder={CONSUMER_COPY.feedback.modal.form.messagePlaceholder}
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
            {CONSUMER_COPY.feedback.modal.errors.messageRequired}
          </HelpText>
        )}
      </div>

      {/* Screenshot attachment */}
      <div>
        <Eyebrow>{CONSUMER_COPY.feedback.modal.form.screenshotEyebrow}</Eyebrow>
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
              aria-label={
                CONSUMER_COPY.feedback.modal.form.screenshotRemoveAriaLabel
              }
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
                {CONSUMER_COPY.feedback.modal.form.screenshotAttachLabel}
              </span>
              <span
                style={{
                  color: 'var(--fg-subtle)',
                  fontSize: 11.5,
                  fontWeight: 500,
                  letterSpacing: 0,
                }}
              >
                {CONSUMER_COPY.feedback.modal.form.screenshotAttachSublabel}
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
        {CONSUMER_COPY.feedback.modal.success.heading}
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
        {CONSUMER_COPY.feedback.modal.success.body}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginTop: 4,
        }}
      >
        <SubmitButton onClick={onClose}>
          {CONSUMER_COPY.feedback.modal.success.primaryAction}
        </SubmitButton>
        <SecondaryButton onClick={onReset}>
          {CONSUMER_COPY.feedback.modal.success.secondaryAction}
        </SecondaryButton>
      </div>
    </div>
  )
}

function ErrorState({
  onRetry,
  onSaveForLater,
}: {
  // Primary action — return to the form WITHOUT clearing inputs (#829).
  onRetry: () => void
  // Secondary action — persist the draft to localStorage then close (#830).
  onSaveForLater: () => void
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
        {CONSUMER_COPY.feedback.modal.error.heading}
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
        {CONSUMER_COPY.feedback.modal.error.body}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginTop: 4,
        }}
      >
        <SubmitButton onClick={onRetry}>
          {CONSUMER_COPY.feedback.modal.error.primaryAction}
        </SubmitButton>
        <SecondaryButton onClick={onSaveForLater}>
          {CONSUMER_COPY.feedback.modal.error.secondaryAction}
        </SecondaryButton>
      </div>
    </div>
  )
}

// ── Context disclosure ────────────────────────────────────────────────────

function ContextDisclosure({ ctx }: { ctx: CtxData }) {
  const [open, setOpen] = useState(false)
  const rows: { key: string; value: string }[] = [
    {
      key: CONSUMER_COPY.feedback.modal.contextDisclosure.fields.route,
      value: ctx.route,
    },
    {
      key: CONSUMER_COPY.feedback.modal.contextDisclosure.fields.theme,
      value: ctx.theme,
    },
    {
      key: CONSUMER_COPY.feedback.modal.contextDisclosure.fields.build,
      value: ctx.build,
    },
    {
      key: CONSUMER_COPY.feedback.modal.contextDisclosure.fields.device,
      value: ctx.device,
    },
    {
      key: CONSUMER_COPY.feedback.modal.contextDisclosure.fields.user,
      value: ctx.user,
    },
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
          {CONSUMER_COPY.feedback.modal.contextDisclosure.toggleLabel}
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
          {CONSUMER_COPY.feedback.modal.contextDisclosure.fieldCount}
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

function DraftRestoredBanner({
  onDiscard,
  disabled,
}: {
  onDiscard: () => void
  disabled: boolean
}) {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        border: '1px solid var(--border-strong)',
        background: 'color-mix(in oklab, var(--signal) 8%, var(--surface-1))',
      }}
    >
      <span
        style={{
          flex: 1,
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--fg)',
          letterSpacing: '-0.005em',
        }}
      >
        {CONSUMER_COPY.feedback.modal.draftBanner.message}
      </span>
      <button
        type="button"
        onClick={onDiscard}
        disabled={disabled}
        aria-label={CONSUMER_COPY.feedback.modal.draftBanner.discardAriaLabel}
        style={{
          all: 'unset',
          cursor: disabled ? 'default' : 'pointer',
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--fg-muted)',
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {CONSUMER_COPY.feedback.modal.draftBanner.discardLabel}
      </button>
    </div>
  )
}

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
    ? CONSUMER_COPY.feedback.modal.headerRail.error
    : isSuccess
      ? CONSUMER_COPY.feedback.modal.headerRail.success
      : CONSUMER_COPY.feedback.modal.headerRail.form
  const code = isError
    ? CONSUMER_COPY.feedback.modal.headerRail.codeError
    : isSuccess
      ? CONSUMER_COPY.feedback.modal.headerRail.codeSuccess
      : CONSUMER_COPY.feedback.modal.headerRail.codeForm
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
    tone === 'success'
      ? CONSUMER_COPY.feedback.modal.statusRail.successLabel
      : CONSUMER_COPY.feedback.modal.statusRail.errorLabel
  const code =
    tone === 'success'
      ? CONSUMER_COPY.feedback.modal.statusRail.successCode
      : CONSUMER_COPY.feedback.modal.statusRail.errorCode
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
      <span>
        {loading ? CONSUMER_COPY.feedback.modal.footer.submitting : children}
      </span>
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
