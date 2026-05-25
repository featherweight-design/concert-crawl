'use client'

import { useState, useCallback, useEffect } from 'react'
import { copy } from './definitions/copy'
import { useRouter } from 'next/navigation'
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
}: SubmitPriceModalProps) {
  const router = useRouter()
  const { getToken } = useAuth()

  const [modalState, setModalState] = useState<ModalState>('loading-check')
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
            setModalState('alreadySubmitted')
            return
          }
        }
      } catch (err) {
        console.error('Failed to check existing submission', err)
      }
      setModalState('form')
    }
    void checkExisting()
  }, [open, eventId, getToken])

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
      const data = (await res.json()) as {
        error?: string
        submission?: PriceSubmission
      }
      if (!res.ok) {
        if (res.status === 409) {
          if (data.submission) {
            setExistingSubmission(data.submission)
          }
          setModalState('alreadySubmitted')
          router.refresh()
          return
        }
        throw new Error(data.error ?? 'Submission failed')
      }
      setModalState('success')
    } catch (err) {
      console.error('Price submission failed', err)
      setModalState('error')
    }
  }, [formState, getToken, eventId, router])

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
      router.refresh()
      onClose()
    } catch (err) {
      console.error('Withdraw failed', err)
      setWithdrawError('network')
      setModalState('error')
    }
  }, [existingSubmission, getToken, router, onClose])

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
        aria-label={copy.modal.closeAriaLabel}
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
      {copy.form.submitButton}
    </SubmitButton>
  ) : undefined

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel={copy.modal.ariaLabel}
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
          {copy.modal.checkingLabel}
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
              {copy.form.contextEyebrow}
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
              label={copy.form.floorLabel}
              value={formState.floor}
              onChange={(val) =>
                setFormState((prev) => ({ ...prev, floor: val }))
              }
              placeholder={copy.form.floorPlaceholder}
              required
              error={fieldErrors['floor']}
              warning={fieldWarnings['floor']}
            />
            <SPNumberField
              id="sp-ceiling"
              label={copy.form.ceilingLabel}
              value={formState.ceiling}
              onChange={(val) =>
                setFormState((prev) => ({ ...prev, ceiling: val }))
              }
              placeholder={copy.form.ceilingPlaceholder}
              error={fieldErrors['ceiling']}
            />
          </div>

          <ChipGroup
            label={copy.form.tierLabel}
            options={TIER_OPTIONS}
            value={formState.tier}
            onChange={(val) => setFormState((prev) => ({ ...prev, tier: val }))}
            error={fieldErrors['tier']}
          />

          <ChipGroup
            label={copy.form.vendorLabel}
            options={VENDOR_OPTIONS}
            value={formState.vendor}
            onChange={(val) =>
              setFormState((prev) => ({ ...prev, vendor: val }))
            }
            error={fieldErrors['vendor']}
          />

          <ChipGroup
            label={copy.form.howFoundLabel}
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
            {copy.form.footerNote}
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
        {copy.success.heading}
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
        }}
      >
        {copy.success.body}
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
          {copy.success.backButton}
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
      ? copy.error.networkWithdrawError
      : withdrawError === 'api'
        ? copy.error.apiWithdrawError
        : copy.error.defaultError

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
        {copy.error.heading}
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
          {copy.error.tryAgainButton}
        </PrimaryButton>
        <GhostButton onClick={onClose}>{copy.error.closeButton}</GhostButton>
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
        {copy.alreadySubmitted.heading}
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
        {copy.alreadySubmitted.limitNote}
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
          {copy.alreadySubmitted.editButton}
        </PrimaryButton>
        <GhostButton onClick={onWithdraw}>
          {copy.alreadySubmitted.withdrawButton}
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
    ? copy.header.eyebrow.error
    : isSuccess
      ? copy.header.eyebrow.success
      : isDone
        ? copy.header.eyebrow.alreadySubmitted
        : copy.header.eyebrow.open
  const code = isError
    ? copy.header.code.error
    : isSuccess
      ? copy.header.code.success
      : isDone
        ? copy.header.code.alreadySubmitted
        : copy.header.code.open
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
        {copy.statusRail.errorLabel}
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
        {copy.statusRail.errorCode}
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
