'use client'

import { useState, useCallback, useEffect } from 'react'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { useAuth } from '@clerk/nextjs'
import { ShieldCheck } from 'lucide-react'
import { ModalShell } from '@/components/consumer/modal-shell'
import { CCMark } from '@/components/brand/cc-mark'
import { SPNumberField } from '../SPNumberField'
import { ChipGroup } from '../ChipGroup'
import { VendorField } from './VendorField'
import { validateSubmission } from '@/lib/sp-policy'
import {
  deriveSourceCategory,
  VENDOR_VALUES,
  type Tier,
  type Vendor,
  type HowFound,
  type PriceSubmission,
  type SourceCategory,
  type SubmissionWithMeta,
} from '@concert-crawl/types'

// Derive the API-required `howFound` from the new `sourceCategory` field.
// The API still requires howFound on POST (price-submissions.ts:29) — this
// 1:1 mapping keeps the legacy payload satisfied while the v2 form drops
// the chip group. boxoffice (bought-it-myself) is the strong signal; standard
// + resale collapse to saw_listing because the form no longer asks "how".
const howFoundForSource = (source: SourceCategory): HowFound =>
  source === 'boxoffice' ? 'bought_myself' : 'saw_listing'

// Pick the sourceCategory to pre-fill on the Edit form. Prefer the explicit
// row value when present; otherwise derive from (vendor, howFound) using the
// shared API helper so a row submitted at the box office doesn't get
// misrepresented as 'standard' just because PR 3 backfill hadn't run yet.
// `deriveSourceCategory` only emits 'boxoffice' or 'standard' — a resale
// row will fall to 'standard', which the user can correct manually in the
// edit form.
const fallbackSourceCategory = (
  submission: Pick<PriceSubmission, 'sourceCategory' | 'vendor' | 'howFound'>,
): SourceCategory =>
  submission.sourceCategory ??
  deriveSourceCategory(submission.vendor, submission.howFound)

// Vendor auto-fill when source = boxoffice. Keeps the VenueBoxOffice enum
// value for the API (contract-PR drops the value later); consumer display
// label is "Venue" per round-3 locked decision #2.
const VENDOR_BOXOFFICE_AUTOFILL: Vendor = 'VenueBoxOffice'

// Type guards for fetch() JSON responses. CLAUDE.md flags `as` casts as a
// last resort; these read-only guards verify the discriminator + shape we
// actually rely on without forcing every PriceSubmission field through a
// runtime validator (preserves existing test mocks).
type PriceSubmissionResponse =
  | { success: true; data: PriceSubmission }
  | { success?: false; error?: string; submission?: PriceSubmission }

const TIERS: readonly Tier[] = ['GA', 'Reserved', 'VIP', 'Pit', 'Lawn']
const SOURCE_CATEGORIES: readonly SourceCategory[] = [
  'boxoffice',
  'standard',
  'resale',
]

// Sets rather than array `.includes`: a `readonly Tier[]` won't accept an
// arbitrary string without an `as` cast, and Set<string> narrows honestly.
const TIER_SET = new Set<string>(TIERS)
const VENDOR_SET = new Set<string>(VENDOR_VALUES)
const SOURCE_CATEGORY_SET = new Set<string>(SOURCE_CATEGORIES)

function isTier(value: string): value is Tier {
  return TIER_SET.has(value)
}

function isVendor(value: string | null): value is Vendor {
  return value !== null && VENDOR_SET.has(value)
}

function isSourceCategory(value: string): value is SourceCategory {
  return SOURCE_CATEGORY_SET.has(value)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function isPriceSubmissionResponse(
  value: unknown,
): value is PriceSubmissionResponse {
  if (!isObject(value)) return false
  // Permissive: a response missing `success` is treated as a failure shape so
  // callers fall through to the error branch without crashing on undefined
  // access. The `data` field is only required when `success === true`.
  if (value['success'] === true) {
    return isObject(value['data'])
  }
  return true
}

interface BatchRowError {
  index: number
  tier: string | null
  error: string
}

type BatchSubmissionResponse =
  // submissionsRemaining (#876): acts left for this (user, event) after this
  // batch. Optional for deploy skew — an older API omits it.
  | { success: true; data: PriceSubmission[]; submissionsRemaining?: number }
  | { success?: false; error?: string; errors?: BatchRowError[] }

function isBatchRowError(value: unknown): value is BatchRowError {
  return (
    isObject(value) &&
    typeof value['index'] === 'number' &&
    (value['tier'] === null || typeof value['tier'] === 'string') &&
    typeof value['error'] === 'string'
  )
}

function isBatchSubmissionResponse(
  value: unknown,
): value is BatchSubmissionResponse {
  if (!isObject(value)) return false
  if (value['success'] === true) {
    const remainingOk =
      value['submissionsRemaining'] === undefined ||
      typeof value['submissionsRemaining'] === 'number'
    return (
      Array.isArray(value['data']) &&
      value['data'].every(isObject) &&
      remainingOk
    )
  }
  // Non-success arm: every field the handler reads must be well-typed when
  // present. A bare `{}` is still valid — an `ok` response with an empty
  // body lands on the success view, matching the single-POST behavior.
  const errorOk =
    value['error'] === undefined || typeof value['error'] === 'string'
  const errorsOk =
    value['errors'] === undefined ||
    (Array.isArray(value['errors']) && value['errors'].every(isBatchRowError))
  return errorOk && errorsOk
}

type SubmissionsListResponse = {
  success: boolean
  data: {
    alreadySubmitted: boolean
    userSubmission: SubmissionWithMeta | null
    // #876 — acts left in the 24h window. Optional for deploy skew: when an
    // older API omits it, the modal falls back to the alreadySubmitted gate.
    submissionsRemaining?: number
  }
}

function isSubmissionsListResponse(
  value: unknown,
): value is SubmissionsListResponse {
  if (!isObject(value)) return false
  if (typeof value['success'] !== 'boolean') return false
  const data = value['data']
  if (!isObject(data)) return false
  if (typeof data['alreadySubmitted'] !== 'boolean') return false
  if (
    data['submissionsRemaining'] !== undefined &&
    typeof data['submissionsRemaining'] !== 'number'
  ) {
    return false
  }
  return true
}

type ModalState =
  | 'loading-check'
  | 'form'
  | 'submitting'
  | 'success'
  | 'error'
  | 'alreadySubmitted'

export interface SubmitPriceResult {
  isEdit: boolean
  id: string
  priceMin: string
  priceMax: string | null
  tier: string
  vendor: string
  howFound: string
  sourceCategory: SourceCategory | null
}

interface SubmitPriceModalProps {
  open: boolean
  onClose: () => void
  eventId: string
  artist: string
  venueName: string
  date: string
  openInEditMode?: boolean
  // When set, the tier picker is pre-populated (still editable so the user
  // can correct it). Used by EventDetailClient when the user clicks "+ Add
  // <tier>" on MTAddTierSuccess.
  preselectedTier?: Tier | null
  // submissionsRemaining is only known on the batch path (#876); edit/PATCH
  // doesn't consume a contribution act, so it passes undefined.
  onSuccess?: (
    results: SubmitPriceResult[],
    submissionsRemaining?: number,
  ) => void
  onWithdrawSuccess?: (submissionId: string) => void
}

const TIER_OPTIONS = [
  { value: 'GA', label: 'GA' },
  { value: 'Reserved', label: 'Reserved' },
  { value: 'VIP', label: 'VIP' },
  { value: 'Pit', label: 'Pit' },
  { value: 'Lawn', label: 'Lawn' },
]

const SOURCE_CATEGORY_OPTIONS = [
  { value: 'boxoffice', label: 'Box office' },
  { value: 'standard', label: 'Standard ticket' },
  { value: 'resale', label: 'Resale' },
]

// One repeatable tier panel of the bundle form (#832). Bundle-level fields
// (sourceCategory, vendor) live in BundleFieldsState — asked once, shared by
// every row on submit.
interface TierPanelState {
  /** Stable identity for React keys — panels can be removed from the middle of the list. */
  uid: number
  tier: string | null
  floor: string
  ceiling: string
}

interface BundleFieldsState {
  sourceCategory: SourceCategory | null
  vendor: string | null
}

let nextPanelUid = 0

const emptyPanel = (tier: Tier | null = null): TierPanelState => ({
  uid: nextPanelUid++,
  tier,
  floor: '',
  ceiling: '',
})

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? ''

export function SubmitPriceModal({
  open,
  onClose,
  eventId,
  artist,
  venueName,
  date,
  openInEditMode = false,
  preselectedTier = null,
  onSuccess,
  onWithdrawSuccess,
}: SubmitPriceModalProps) {
  const { getToken } = useAuth()

  const [modalState, setModalState] = useState<ModalState>('loading-check')
  const [isEditMode, setIsEditMode] = useState(false)
  const [bundleState, setBundleState] = useState<BundleFieldsState>({
    sourceCategory: null,
    vendor: null,
  })
  const [panels, setPanels] = useState<TierPanelState[]>([
    emptyPanel(preselectedTier),
  ])
  const [bundleErrors, setBundleErrors] = useState<
    Partial<Record<string, string>>
  >({})
  const [panelErrors, setPanelErrors] = useState<
    Array<Partial<Record<string, string>>>
  >([{}])
  const [panelWarnings, setPanelWarnings] = useState<
    Array<Partial<Record<string, string>>>
  >([{}])
  // SubmissionWithMeta rather than PriceSubmission: the only writer is the
  // `userSubmission` field of the submissions-list response, whose `userId` is
  // null for anonymous callers since #794.
  const [existingSubmission, setExistingSubmission] =
    useState<SubmissionWithMeta | null>(null)
  const [withdrawError, setWithdrawError] = useState<'network' | 'api' | null>(
    null,
  )

  useEffect(() => {
    if (!open) return
    setModalState('loading-check')
    setIsEditMode(false)
    setBundleErrors({})
    setPanelErrors([{}])
    setPanelWarnings([{}])
    // Reset the per-session error + existing-submission state on every open.
    // Without this, a previous session's withdraw-error or alreadySubmitted
    // payload could leak into a fresh session and surface the wrong error
    // copy (e.g. withdraw-specific message after a submit failure).
    setWithdrawError(null)
    setExistingSubmission(null)
    // Reset the form on each open. Without this, the modal — which stays
    // mounted across open/close — would carry over the previous tier
    // selection, defeating the `preselectedTier` from the "+ Add VIP" loop
    // in MTAddTierSuccess (Q4-eng session flow). The edit-mode branch below
    // overwrites these with the existing submission's values.
    setBundleState({ sourceCategory: null, vendor: null })
    setPanels([emptyPanel(preselectedTier)])

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
          const raw: unknown = await res.json()
          if (!isSubmissionsListResponse(raw)) {
            setModalState('form')
            return
          }
          const body = raw
          if (body.data.userSubmission) {
            setExistingSubmission(body.data.userSubmission)
          }
          if (openInEditMode && body.data.userSubmission) {
            // Skip the "Already in." screen — go straight to the edit form.
            // sourceCategory from the existing row drives the floor label.
            // For legacy rows where sourceCategory is null, derive it from
            // (vendor, howFound) via the shared helper so a box-office
            // submission isn't misrepresented as 'standard'.
            setBundleState({
              vendor: body.data.userSubmission.vendor,
              sourceCategory: fallbackSourceCategory(body.data.userSubmission),
            })
            setPanels([
              {
                ...emptyPanel(),
                tier: body.data.userSubmission.tier,
                floor: body.data.userSubmission.priceMin,
                ceiling: body.data.userSubmission.priceMax ?? '',
              },
            ])
            setIsEditMode(true)
            setModalState('form')
            return
          }
          // #876 — up to 3 contribution acts per (user, event)/24h. When the
          // API reports acts remaining, gate on that: a pending submission no
          // longer blocks follow-ups. Older APIs omit the field → fall back
          // to alreadySubmitted alone: it also covers recent corroborated
          // rows (where userSubmission is null), which the old API would
          // 429 on a fresh POST. The exhausted screen's edit/withdraw
          // actions are separately conditional on a pending submission.
          const exhausted =
            body.data.submissionsRemaining !== undefined
              ? body.data.submissionsRemaining <= 0
              : body.data.alreadySubmitted
          if (exhausted) {
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
  }, [open, eventId, getToken, openInEditMode, preselectedTier])

  const addPanel = () => {
    setPanels((prev) => [...prev, emptyPanel()])
    setPanelErrors((prev) => [...prev, {}])
    setPanelWarnings((prev) => [...prev, {}])
  }

  const removePanel = (panelIndex: number) => {
    setPanels((prev) => prev.filter((_row, idx) => idx !== panelIndex))
    setPanelErrors((prev) => prev.filter((_row, idx) => idx !== panelIndex))
    setPanelWarnings((prev) => prev.filter((_row, idx) => idx !== panelIndex))
  }

  const updatePanel = (panelIndex: number, patch: Partial<TierPanelState>) => {
    setPanels((prev) =>
      prev.map((panel, idx) =>
        idx === panelIndex ? { ...panel, ...patch } : panel,
      ),
    )
  }

  // Tiers already selected in OTHER panels are disabled — the same tier can
  // never appear twice in a bundle (mirrors the API's uniqueness refine).
  const tierOptionsForPanel = (panelIndex: number) =>
    TIER_OPTIONS.map((option) => ({
      ...option,
      disabled: panels.some(
        (panel, idx) => idx !== panelIndex && panel.tier === option.value,
      ),
    }))

  const handleSubmit = useCallback(async () => {
    // Validate every panel through the shared single-submission validator,
    // injecting the bundle-level fields into each panel's input. Bundle-field
    // errors (sourceCategory, vendor) are hoisted out of the per-panel maps so
    // they render once at the top of the form.
    const nextPanelErrors: Array<Partial<Record<string, string>>> = []
    const nextPanelWarnings: Array<Partial<Record<string, string>>> = []
    const nextBundleErrors: Partial<Record<string, string>> = {}
    let allValid = true
    for (const panel of panels) {
      const validation = validateSubmission({
        floor: panel.floor,
        ceiling: panel.ceiling,
        tier: panel.tier,
        vendor: bundleState.vendor,
        sourceCategory: bundleState.sourceCategory,
      })
      const {
        sourceCategory: sourceError,
        vendor: vendorError,
        ...rowErrors
      } = validation.errors
      if (sourceError) nextBundleErrors['sourceCategory'] = sourceError
      if (vendorError) nextBundleErrors['vendor'] = vendorError
      nextPanelErrors.push(rowErrors)
      nextPanelWarnings.push(validation.warnings)
      if (!validation.valid) allValid = false
    }
    setPanelErrors(nextPanelErrors)
    setPanelWarnings(nextPanelWarnings)
    setBundleErrors(nextBundleErrors)
    if (!allValid) return

    // Runtime enum guards — validateSubmission guarantees non-null but not
    // enum membership (no `as` casts per CLAUDE.md).
    if (
      bundleState.sourceCategory === null ||
      bundleState.vendor === null ||
      !isVendor(bundleState.vendor)
    ) {
      console.error(
        'Submit reached non-null guard with invalid bundle fields',
        bundleState,
      )
      setModalState('error')
      return
    }
    const sourceCategory: SourceCategory = bundleState.sourceCategory

    const tierRows: Array<{ tier: Tier; priceMin: number; priceMax?: number }> =
      []
    for (const panel of panels) {
      if (panel.tier === null || !isTier(panel.tier)) {
        console.error('Submit reached non-null guard with invalid tier', panel)
        setModalState('error')
        return
      }
      tierRows.push({
        tier: panel.tier,
        priceMin: Number(panel.floor),
        ...(panel.ceiling ? { priceMax: Number(panel.ceiling) } : {}),
      })
    }

    setModalState('submitting')
    try {
      const token = await getToken()
      if (!token) {
        setModalState('error')
        return
      }

      const vendor: Vendor =
        sourceCategory === 'boxoffice'
          ? VENDOR_BOXOFFICE_AUTOFILL
          : bundleState.vendor
      const howFound: HowFound = howFoundForSource(sourceCategory)

      // Edit mode → PATCH the existing single submission (spec §4: editing
      // never converts a single into a bundle; the form is locked to one
      // panel in edit mode).
      if (isEditMode && existingSubmission) {
        const firstPanel = tierRows[0]
        if (!firstPanel) {
          setModalState('error')
          return
        }
        const res = await fetch(
          `${API_URL}/v1/submissions/${existingSubmission.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              floor: firstPanel.priceMin,
              ...(firstPanel.priceMax != null
                ? { ceiling: firstPanel.priceMax }
                : {}),
              tier: firstPanel.tier,
              vendor,
              howFound,
            }),
          },
        )
        const patchRaw: unknown = await res.json()
        if (!isPriceSubmissionResponse(patchRaw)) {
          throw new Error('Edit failed (invalid response shape)')
        }
        const patchResponse = patchRaw
        if (!res.ok || !patchResponse.success) {
          throw new Error(
            (!patchResponse.success && patchResponse.error) || 'Edit failed',
          )
        }
        onSuccess?.([
          {
            isEdit: true,
            id: existingSubmission.id,
            priceMin: String(firstPanel.priceMin),
            priceMax:
              firstPanel.priceMax != null ? String(firstPanel.priceMax) : null,
            tier: firstPanel.tier,
            vendor,
            howFound,
            sourceCategory: patchResponse.data.sourceCategory,
          },
        ])
        setModalState('success')
        return
      }

      // Bundle POST — one atomic request, all rows or none (spec §2).
      const res = await fetch(
        `${API_URL}/v1/events/${eventId}/price-submissions/batch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            vendor,
            howFound,
            sourceCategory,
            tiers: tierRows,
          }),
        },
      )
      const rawResponse: unknown = await res.json()
      if (!isBatchSubmissionResponse(rawResponse)) {
        throw new Error('Submission failed (invalid response shape)')
      }
      if (!res.ok) {
        const rowErrors =
          rawResponse.success !== true ? (rawResponse.errors ?? []) : []
        if (res.status === 422 && rowErrors.length > 0) {
          // Per-row 422 → annotate the exact panel and stay on the form with
          // every value intact (spec §3: atomic rejection never wipes input).
          setPanelErrors((prev) => {
            const next = prev.map((panelError) => ({ ...panelError }))
            for (const rowError of rowErrors) {
              const target = next[rowError.index]
              if (!target) continue
              target['tier'] =
                rowError.error === 'already_submitted'
                  ? CONSUMER_COPY.submitPriceV2.multiTier.errorAlreadySubmitted.replace(
                      '{tier}',
                      rowError.tier ?? '',
                    )
                  : rowError.error
            }
            return next
          })
          setModalState('form')
          return
        }
        throw new Error(
          (rawResponse.success !== true && rawResponse.error) ||
            'Submission failed',
        )
      }
      if (rawResponse.success === true) {
        onSuccess?.(
          rawResponse.data.map((row) => ({
            isEdit: false,
            id: row.id,
            priceMin: row.priceMin,
            priceMax: row.priceMax,
            tier: row.tier,
            vendor: row.vendor,
            howFound: row.howFound,
            sourceCategory: row.sourceCategory,
          })),
          rawResponse.submissionsRemaining,
        )
      }
      setModalState('success')
    } catch (err) {
      console.error('Price submission failed', err)
      setModalState('error')
    }
  }, [
    panels,
    bundleState,
    isEditMode,
    existingSubmission,
    getToken,
    eventId,
    onSuccess,
  ])

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

  const submitLabel = isEditMode
    ? CONSUMER_COPY.submitPriceV2.multiTier.submitButtonEdit
    : panels.length > 1
      ? CONSUMER_COPY.submitPriceV2.multiTier.submitButtonMulti.replace(
          '{count}',
          String(panels.length),
        )
      : CONSUMER_COPY.submitPrice.form.submitButton

  const footer = showForm ? (
    <SubmitButton loading={modalState === 'submitting'} onClick={handleSubmit}>
      {submitLabel}
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
              setBundleState({
                vendor: existingSubmission.vendor,
                sourceCategory: fallbackSourceCategory(existingSubmission),
              })
              setPanels([
                {
                  ...emptyPanel(),
                  tier: existingSubmission.tier,
                  floor: existingSubmission.priceMin,
                  ceiling: existingSubmission.priceMax ?? '',
                },
              ])
            }
            setBundleErrors({})
            setPanelErrors([{}])
            setPanelWarnings([{}])
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

          {/* Source-category — provenance FIRST (Q2-lock: where is this from?) */}
          <ChipGroup
            label={CONSUMER_COPY.submitPriceV2.sourceLabel}
            options={SOURCE_CATEGORY_OPTIONS}
            value={bundleState.sourceCategory}
            onChange={(val) =>
              setBundleState((prev) => {
                // ChipGroup is generic; narrow to the SourceCategory enum
                // (ignore the change if somehow an out-of-enum value arrives).
                if (!isSourceCategory(val)) return prev
                const nextSource = val
                // When source flips to boxoffice, auto-fill the vendor so the
                // user doesn't have to pick it twice. When the source flips
                // AWAY from boxoffice AND the vendor was the auto-fill value,
                // clear it so the user doesn't accidentally submit e.g. a
                // resale price with vendor='VenueBoxOffice'.
                let nextVendor: string | null
                if (nextSource === 'boxoffice') {
                  nextVendor = VENDOR_BOXOFFICE_AUTOFILL
                } else if (prev.vendor === VENDOR_BOXOFFICE_AUTOFILL) {
                  nextVendor = null
                } else {
                  nextVendor = prev.vendor
                }
                return {
                  ...prev,
                  sourceCategory: nextSource,
                  vendor: nextVendor,
                }
              })
            }
            error={bundleErrors['sourceCategory']}
            req
            // Edit mode: PATCH /v1/submissions/:id intentionally preserves
            // any non-null sourceCategory on the existing row and does not
            // accept a new value. Locking the chips here keeps the UI
            // honest — otherwise users could appear to flip the provenance
            // and silently end up with vendor/howFound updated while the
            // stored sourceCategory stayed the original value.
            disabled={isEditMode}
          />

          {/* Vendor — moved above tier panels so bundle-level fields precede
              per-panel fields in DOM order. */}
          <VendorField
            value={isVendor(bundleState.vendor) ? bundleState.vendor : null}
            onChange={(val) =>
              setBundleState((prev) => ({ ...prev, vendor: val }))
            }
            error={bundleErrors['vendor']}
            // When source=boxoffice, the vendor auto-fills to VenueBoxOffice
            // and handleSubmit unconditionally overrides any other choice.
            // Lock the field so the UI selection and the submitted payload
            // can't diverge (e.g. "AXS" shown while payload sends "Venue").
            disabled={bundleState.sourceCategory === 'boxoffice'}
          />
          {bundleState.sourceCategory === 'boxoffice' &&
            bundleState.vendor === VENDOR_BOXOFFICE_AUTOFILL && (
              <p
                style={{
                  margin: '-12px 0 0 0',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--fg-subtle)',
                  letterSpacing: '0.04em',
                }}
              >
                {CONSUMER_COPY.submitPriceV2.vendorAutoFilledNote}
              </p>
            )}

          {/* Tier panels — repeatable per-tier rows */}
          {panels.map((panel, panelIndex) => (
            <div
              key={panel.uid}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                ...(panelIndex > 0
                  ? { borderTop: '1px solid var(--border)', paddingTop: 18 }
                  : {}),
              }}
            >
              {panels.length > 1 && !isEditMode && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--fg-subtle)',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {panel.tier ??
                      CONSUMER_COPY.submitPriceV2.multiTier
                        .panelFallbackHeading}
                  </span>
                  <button
                    type="button"
                    aria-label={CONSUMER_COPY.submitPriceV2.multiTier.removeTierAriaLabel.replace(
                      '{tier}',
                      panel.tier ??
                        CONSUMER_COPY.submitPriceV2.multiTier
                          .panelFallbackHeading,
                    )}
                    onClick={() => removePanel(panelIndex)}
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      width: 24,
                      height: 24,
                      borderRadius: 6,
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
              )}

              <ChipGroup
                label={CONSUMER_COPY.submitPriceV2.tierLabel}
                options={tierOptionsForPanel(panelIndex)}
                value={panel.tier}
                onChange={(val) => updatePanel(panelIndex, { tier: val })}
                error={panelErrors[panelIndex]?.['tier']}
                // Edit mode never converts a single into a bundle — tier is locked
                // (spec §4). The PATCH endpoint identifies the row; changing tier is
                // still possible via the API but the bundle form disallows it.
                disabled={isEditMode}
              />

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <SPNumberField
                    id={`sp-floor-${panelIndex}`}
                    label={
                      bundleState.sourceCategory === 'boxoffice'
                        ? CONSUMER_COPY.submitPriceV2.floorLabelBoxoffice
                        : bundleState.sourceCategory === 'resale'
                          ? CONSUMER_COPY.submitPriceV2.floorLabelResale
                          : CONSUMER_COPY.submitPriceV2.floorLabelStandard
                    }
                    value={panel.floor}
                    onChange={(val) => updatePanel(panelIndex, { floor: val })}
                    placeholder={CONSUMER_COPY.submitPriceV2.floorPlaceholder}
                    required
                    error={panelErrors[panelIndex]?.['floor']}
                    warning={panelWarnings[panelIndex]?.['floor']}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <SPNumberField
                    id={`sp-ceiling-${panelIndex}`}
                    label={CONSUMER_COPY.submitPriceV2.ceilingLabel}
                    value={panel.ceiling}
                    onChange={(val) =>
                      updatePanel(panelIndex, { ceiling: val })
                    }
                    placeholder={CONSUMER_COPY.submitPriceV2.ceilingPlaceholder}
                    error={panelErrors[panelIndex]?.['ceiling']}
                  />
                </div>
              </div>
              {bundleState.sourceCategory === 'boxoffice' && (
                <p
                  style={{
                    margin: '-12px 0 0 0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--fg-subtle)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {CONSUMER_COPY.submitPriceV2.floorHintBoxoffice}
                </p>
              )}
            </div>
          ))}

          {!isEditMode && panels.length < TIER_OPTIONS.length && (
            <button
              type="button"
              onClick={addPanel}
              style={{
                all: 'unset',
                cursor: 'pointer',
                alignSelf: 'flex-start',
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--signal)',
                letterSpacing: '-0.005em',
                padding: '4px 0',
              }}
            >
              {CONSUMER_COPY.submitPriceV2.multiTier.addTierButton}
            </button>
          )}

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
  submission: SubmissionWithMeta | null
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
      {submission && (
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
      )}
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
