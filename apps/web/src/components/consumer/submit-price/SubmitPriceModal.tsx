'use client'

import { useState, useCallback, useEffect } from 'react'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { useAuth } from '@clerk/nextjs'
import { ShieldCheck } from 'lucide-react'
import { ModalShell } from '@/components/consumer/modal-shell'
import { CCMark } from '@/components/brand/cc-mark'
import { SPNumberField } from '../SPNumberField'
import { ChipGroup } from '../ChipGroup'
import { validateSubmission, type SubmissionInput } from '@/lib/sp-policy'
import type {
  Tier,
  Vendor,
  HowFound,
  PriceSubmission,
  SubmissionWithMeta,
} from '@concert-crawl/types'

type ModalState =
  | 'loading-check'
  | 'form'
  | 'submitting'
  | 'success'
  | 'error'
  | 'alreadySubmitted'

interface SubmitPriceModalProps {
  open: boolean
  onClose: () => void
  eventId: string
  artist: string
  venueName: string
  date: string
  openInEditMode?: boolean
  onSuccess?: (result: {
    isEdit: boolean
    id: string
    priceMin: string
    priceMax: string | null
    tier: string
    vendor: string
    howFound: string
  }) => void
  onWithdrawSuccess?: (submissionId: string) => void
}

const TIER_OPTIONS = [
  { value: 'GA', label: 'GA' },
  { value: 'Reserved', label: 'Reserved' },
  { value: 'VIP', label: 'VIP' },
  { value: 'Pit', label: 'Pit' },
  { value: 'Lawn', label: 'Lawn' },
]

const VENDOR_OPTIONS = [
  { value: 'AXS', label: 'AXS' },
  { value: 'Ticketmaster', label: 'Ticketmaster' },
  { value: 'SeatGeek', label: 'SeatGeek' },
  { value: 'DICE', label: 'DICE' },
  { value: 'Eventbrite', label: 'Eventbrite' },
  { value: 'VenueBoxOffice', label: 'Venue box office' },
]

const HOW_FOUND_OPTIONS = [
  { value: 'bought_myself', label: 'Bought it myself' },
  { value: 'saw_listing', label: 'Saw the listing' },
  { value: 'at_the_venue', label: 'At the venue' },
]

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? ''

export function SubmitPriceModal({
  open,
  onClose,
  eventId,
  artist,
  venueName,
  date,
  openInEditMode = false,
  onSuccess,
  onWithdrawSuccess,
}: SubmitPriceModalProps) {
  const { getToken } = useAuth()

  const [modalState, setModalState] = useState<ModalState>('loading-check')
  const [isEditMode, setIsEditMode] = useState(false)
  const [formState, setFormState] = useState<SubmissionInput>({
    floor: '',
    ceiling: '',
    tier: null,
    vendor: null,
    howFound: null,
  })
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({})
  const [fieldWarnings, setFieldWarnings] = useState<
    Partial<Record<string, string>>
  >({})
  const [existingSubmission, setExistingSubmission] =
    useState<PriceSubmission | null>(null)
  const [withdrawError, setWithdrawError] = useState<'network' | 'api' | null>(
    null,
  )

  useEffect(() => {
    if (!open) return
    setModalState('loading-check')
    setIsEditMode(false)
    setFieldErrors({})
    setFieldWarnings({})

    const checkExisting = async () => {
      try {
        const token = await getToken()
        if (!token) {
          setModalState('form')
          return
        }
        const res = await fetch(
          `${API_URL}/v1/events/${eventId}/price-submissions`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (res.ok) {
          const body = (await res.json()) as {
            success: boolean
            data: {
              alreadySubmitted: boolean
              userSubmission: SubmissionWithMeta | null
            }
          }
          if (body.data.alreadySubmitted && body.data.userSubmission) {
            setExistingSubmission(body.data.userSubmission)
            if (openInEditMode) {
              // Skip the "Already in." screen — go straight to the edit form
              setFormState({
                floor: body.data.userSubmission.priceMin,
                ceiling: body.data.userSubmission.priceMax ?? '',
                tier: body.data.userSubmission.tier,
                vendor: body.data.userSubmission.vendor,
                howFound: body.data.userSubmission.howFound,
              })
              setIsEditMode(true)
              setModalState('form')
            } else {
              setModalState('alreadySubmitted')
            }
            return
          }
        }
      } catch (err) {
        console.error('Failed to check existing submission', err)
      }
      setModalState('form')
    }
    void checkExisting()
  }, [open, eventId, getToken, openInEditMode])

  const handleSubmit = useCallback(async () => {
    const validation = validateSubmission(formState)
    setFieldErrors(validation.errors)
    setFieldWarnings(validation.warnings)
    if (!validation.valid) return

    setModalState('submitting')
    try {
      const token = await getToken()
      if (!token) {
        setModalState('error')
        return
      }

      // Edit mode → PATCH the existing submission instead of POST a new one
      if (isEditMode && existingSubmission) {
        const res = await fetch(
          `${API_URL}/v1/submissions/${existingSubmission.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              floor: Number(formState.floor),
              ...(formState.ceiling
                ? { ceiling: Number(formState.ceiling) }
                : {}),
              tier: formState.tier as Tier,
              vendor: formState.vendor as Vendor,
              howFound: formState.howFound as HowFound,
            }),
          },
        )
        if (!res.ok) {
          const data = (await res.json()) as { error?: string }
          throw new Error(data.error ?? 'Edit failed')
        }
        onSuccess?.({
          isEdit: true,
          id: existingSubmission.id,
          priceMin: String(formState.floor),
          priceMax: formState.ceiling ? String(formState.ceiling) : null,
          tier: formState.tier!,
          vendor: formState.vendor!,
          howFound: formState.howFound!,
        })
        setModalState('success')
        return
      }

      const res = await fetch(
        `${API_URL}/v1/events/${eventId}/price-submissions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            priceMin: Number(formState.floor),
            priceMax: formState.ceiling ? Number(formState.ceiling) : undefined,
            tier: formState.tier as Tier,
            vendor: formState.vendor as Vendor,
            howFound: formState.howFound as HowFound,
          }),
        },
      )
      const responseData = (await res.json()) as
        | { success: true; data: PriceSubmission }
        | { success: false; error?: string; submission?: PriceSubmission }
      if (!res.ok) {
        if (res.status === 409) {
          if (!responseData.success && responseData.submission) {
            setExistingSubmission(responseData.submission)
          }
          setModalState('alreadySubmitted')
          return
        }
        throw new Error(
          (!responseData.success && responseData.error) || 'Submission failed',
        )
      }
      if (responseData.success) {
        onSuccess?.({
          isEdit: false,
          id: responseData.data.id,
          priceMin: responseData.data.priceMin,
          priceMax: responseData.data.priceMax,
          tier: responseData.data.tier,
          vendor: responseData.data.vendor,
          howFound: responseData.data.howFound,
        })
      }
      setModalState('success')
    } catch (err) {
      console.error('Price submission failed', err)
      setModalState('error')
    }
  }, [formState, isEditMode, existingSubmission, getToken, eventId, onSuccess])

  const handleWithdraw = useCallback(async () => {
    if (!existingSubmission) return
    try {
      const token = await getToken()
      const res = await fetch(
        `${API_URL}/v1/submissions/${existingSubmission.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token ?? ''}` },
        },
      )
      if (!res.ok) {
        setWithdrawError('api')
        setModalState('error')
        return
      }
      onWithdrawSuccess?.(existingSubmission.id)
      onClose()
    } catch (err) {
      console.error('Withdraw failed', err)
      setWithdrawError('network')
      setModalState('error')
    }
  }, [existingSubmission, getToken, onWithdrawSuccess, onClose])

  const dateStr = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Denver',
  })

  const showForm = modalState === 'form' || modalState === 'submitting'
  const isShort =
    modalState === 'success' ||
    modalState === 'error' ||
    modalState === 'alreadySubmitted'

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <CCMark size={22} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <PriceHeaderRail state={modalState} />
      </div>
      <button
        type="button"
        aria-label={CONSUMER_COPY.submitPrice.modal.closeAriaLabel}
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
  )

  const footer = showForm ? (
    <SubmitButton loading={modalState === 'submitting'} onClick={handleSubmit}>
      {CONSUMER_COPY.submitPrice.form.submitButton}
    </SubmitButton>
  ) : undefined

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel={CONSUMER_COPY.submitPrice.modal.ariaLabel}
      sheetHeight={isShort ? 'short' : 'tall'}
      header={header}
      footer={footer}
    >
      {modalState === 'loading-check' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 120,
            color: 'var(--fg-subtle)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.08em',
          }}
        >
          {CONSUMER_COPY.submitPrice.modal.checkingLabel}
        </div>
      )}

      {modalState === 'success' && <SuccessState onClose={onClose} />}

      {modalState === 'error' && (
        <ErrorState
          onReset={() => {
            setWithdrawError(null)
            setModalState('form')
          }}
          onClose={onClose}
          withdrawError={withdrawError}
        />
      )}

      {modalState === 'alreadySubmitted' && (
        <AlreadySubmittedState
          submission={existingSubmission}
          onEdit={() => {
            if (existingSubmission) {
              setFormState({
                floor: existingSubmission.priceMin,
                ceiling: existingSubmission.priceMax ?? '',
                tier: existingSubmission.tier,
                vendor: existingSubmission.vendor,
                howFound: existingSubmission.howFound,
              })
            }
            setFieldErrors({})
            setFieldWarnings({})
            setIsEditMode(true)
            setModalState('form')
          }}
          onWithdraw={handleWithdraw}
        />
      )}

      {showForm && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            opacity: modalState === 'submitting' ? 0.6 : 1,
            pointerEvents: modalState === 'submitting' ? 'none' : 'auto',
          }}
        >
          {/* Context header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--fg-muted)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {CONSUMER_COPY.submitPrice.form.contextEyebrow}
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-ui)',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--fg)',
                letterSpacing: '-0.02em',
              }}
            >
              {artist}
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--fg-muted)',
              }}
            >
              {venueName} · {dateStr}
            </p>
          </div>

          {/* Anti-abuse banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              padding: '10px 12px',
            }}
          >
            <ShieldCheck
              size={14}
              style={{ flexShrink: 0, color: 'var(--fg-muted)' }}
            />
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                color: 'var(--fg-muted)',
                lineHeight: 1.5,
              }}
            >
              Prices are capped at <strong>$2,000</strong>. Submissions stay{' '}
              <em>pending</em> until 2 fans confirm.
            </p>
          </div>

          {/* Floor + Ceiling */}
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
          >
            <SPNumberField
              id="sp-floor"
              label={CONSUMER_COPY.submitPrice.form.floorLabel}
              value={formState.floor}
              onChange={(val) =>
                setFormState((prev) => ({ ...prev, floor: val }))
              }
              placeholder={CONSUMER_COPY.submitPrice.form.floorPlaceholder}
              required
              error={fieldErrors['floor']}
              warning={fieldWarnings['floor']}
            />
            <SPNumberField
              id="sp-ceiling"
              label={CONSUMER_COPY.submitPrice.form.ceilingLabel}
              value={formState.ceiling}
              onChange={(val) =>
                setFormState((prev) => ({ ...prev, ceiling: val }))
              }
              placeholder={CONSUMER_COPY.submitPrice.form.ceilingPlaceholder}
              error={fieldErrors['ceiling']}
            />
          </div>

          <ChipGroup
            label={CONSUMER_COPY.submitPrice.form.tierLabel}
            options={TIER_OPTIONS}
            value={formState.tier}
            onChange={(val) => setFormState((prev) => ({ ...prev, tier: val }))}
            error={fieldErrors['tier']}
          />

          <ChipGroup
            label={CONSUMER_COPY.submitPrice.form.vendorLabel}
            options={VENDOR_OPTIONS}
            value={formState.vendor}
            onChange={(val) =>
              setFormState((prev) => ({ ...prev, vendor: val }))
            }
            error={fieldErrors['vendor']}
          />

          <ChipGroup
            label={CONSUMER_COPY.submitPrice.form.howFoundLabel}
            options={HOW_FOUND_OPTIONS}
            value={formState.howFound}
            onChange={(val) =>
              setFormState((prev) => ({ ...prev, howFound: val }))
            }
            error={fieldErrors['howFound']}
          />

          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: 11,
              color: 'var(--fg-subtle)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            {CONSUMER_COPY.submitPrice.form.footerNote}
          </p>
        </div>
      )}
    </ModalShell>
  )
}

// ── Sub-views ────────────────────────────────────────────────────────────────

function SuccessState({ onClose }: { onClose: () => void }) {
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
        }}
      >
        {CONSUMER_COPY.submitPrice.success.heading}
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
        }}
      >
        {CONSUMER_COPY.submitPrice.success.body}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginTop: 4,
        }}
      >
        <PrimaryButton onClick={onClose}>
          {CONSUMER_COPY.submitPrice.success.backButton}
        </PrimaryButton>
      </div>
    </div>
  )
}

function ErrorState({
  onReset,
  onClose,
  withdrawError,
}: {
  onReset: () => void
  onClose: () => void
  withdrawError?: 'network' | 'api' | null
}) {
  const errorMessage =
    withdrawError === 'network'
      ? CONSUMER_COPY.submitPrice.error.networkWithdrawError
      : withdrawError === 'api'
        ? CONSUMER_COPY.submitPrice.error.apiWithdrawError
        : CONSUMER_COPY.submitPrice.error.defaultError

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
        }}
      >
        {CONSUMER_COPY.submitPrice.error.heading}
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
        }}
      >
        {errorMessage}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginTop: 4,
        }}
      >
        <PrimaryButton onClick={onReset}>
          {CONSUMER_COPY.submitPrice.error.tryAgainButton}
        </PrimaryButton>
        <GhostButton onClick={onClose}>
          {CONSUMER_COPY.submitPrice.error.closeButton}
        </GhostButton>
      </div>
    </div>
  )
}

function AlreadySubmittedState({
  submission,
  onEdit,
  onWithdraw,
}: {
  submission: PriceSubmission | null
  onEdit: () => void
  onWithdraw: () => void
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
        }}
      >
        {CONSUMER_COPY.submitPrice.alreadySubmitted.heading}
      </div>
      {submission && (
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--fg-muted)',
          }}
        >
          ${submission.priceMin}
          {submission.priceMax ? ` – $${submission.priceMax}` : ''} ·{' '}
          {submission.tier} · {submission.vendor}
        </p>
      )}
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          color: 'var(--fg-subtle)',
        }}
      >
        {CONSUMER_COPY.submitPrice.alreadySubmitted.limitNote}
      </p>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginTop: 4,
        }}
      >
        <PrimaryButton onClick={onEdit}>
          {CONSUMER_COPY.submitPrice.alreadySubmitted.editButton}
        </PrimaryButton>
        <GhostButton onClick={onWithdraw}>
          {CONSUMER_COPY.submitPrice.alreadySubmitted.withdrawButton}
        </GhostButton>
      </div>
    </div>
  )
}

// ── Primitive atoms ───────────────────────────────────────────────────────────

function PriceHeaderRail({ state }: { state: ModalState }) {
  const isError = state === 'error'
  const isSuccess = state === 'success'
  const isDone = state === 'alreadySubmitted'
  const accent = isError
    ? 'var(--warning)'
    : isSuccess
      ? 'var(--signal)'
      : 'var(--accent)'
  const eyebrow = isError
    ? CONSUMER_COPY.submitPrice.header.eyebrow.error
    : isSuccess
      ? CONSUMER_COPY.submitPrice.header.eyebrow.success
      : isDone
        ? CONSUMER_COPY.submitPrice.header.eyebrow.alreadySubmitted
        : CONSUMER_COPY.submitPrice.header.eyebrow.open
  const code = isError
    ? CONSUMER_COPY.submitPrice.header.code.error
    : isSuccess
      ? CONSUMER_COPY.submitPrice.header.code.success
      : isDone
        ? CONSUMER_COPY.submitPrice.header.code.alreadySubmitted
        : CONSUMER_COPY.submitPrice.header.code.open
  const pulse =
    state === 'form' || state === 'submitting' || state === 'loading-check'

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

function StatusRail({ tone }: { tone: 'error' }) {
  const accent = tone === 'error' ? 'var(--warning)' : 'var(--signal)'
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
        {CONSUMER_COPY.submitPrice.statusRail.errorLabel}
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
        {CONSUMER_COPY.submitPrice.statusRail.errorCode}
      </span>
    </div>
  )
}

function PrimaryButton({
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
        transition: 'opacity .12s',
      }}
    >
      {children}
    </button>
  )
}

const SubmitButton = PrimaryButton

function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
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
        width: '100%',
        boxSizing: 'border-box',
        height: 44,
        borderRadius: 10,
        color: 'var(--fg-muted)',
        fontFamily: 'var(--font-ui)',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '-0.005em',
        textAlign: 'center',
      }}
    >
      {children}
    </button>
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
