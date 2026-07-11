'use client'

/**
 * EventDetailClient — three focused client islands for the event detail page.
 *
 * EventDetailBanners  → above the event title (LiveReportBanner, PendingReportBanner)
 * EventDetailPriceBlock → in the price slot (PendingSoldOutCard, PendingCardB, multi-tier)
 * EventDetailFooter   → below related shows (ReportFooterLink + ReportSheet)
 *
 * All three receive the same `event`, `reports`, and `currentUserId` props from the
 * server component, keeping data-fetching entirely server-side.
 */

import { useState, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import type {
  EventReport,
  EventDetailResponse,
  Tier,
  SourceCategory,
} from '@concert-crawl/types'
import { SP_POLICY } from '@concert-crawl/types'
import { confirmEventReport, withdrawEventReport } from '@/lib/events'
import { PendingCardB } from '@/components/consumer/PendingCardB'
import { CorroborationSheet } from '@/components/consumer/CorroborationSheet'
import { MixedTierCard } from '@/components/consumer/multi-tier/MixedTierCard'
import { MultiTierLiveCard } from '@/components/consumer/multi-tier/MultiTierLiveCard'
import { TwoPendingStack } from '@/components/consumer/multi-tier/TwoPendingStack'
import { PendingReportBanner } from '@/components/consumer/reporting/PendingReportBanner'
import { PendingSoldOutCard } from '@/components/consumer/reporting/PendingSoldOutCard'
import { LiveReportBanner } from '@/components/consumer/reporting/LiveReportBanner'
import { ReportFooterLink } from '@/components/consumer/reporting/ReportFooterLink'
import { ReportSheet } from '@/components/consumer/reporting/ReportSheet'
import { EvidenceForm } from '@/components/consumer/reporting/EvidenceForm'
import { ConfirmReportSheet } from '@/components/consumer/reporting/ConfirmReportSheet'
import { PriceDisplay } from '@/components/consumer/PriceDisplay'
import { DisputedPriceCard } from '@/components/consumer/DisputedPriceCard'
import { SoldOutPriceCard } from '@/components/consumer/SoldOutPriceCard'
import { SubmitPriceCardCta } from '@/components/consumer/SubmitPriceCardCta'
import {
  SubmitPriceModal,
  type SubmitPriceResult,
} from '@/components/consumer/submit-price/SubmitPriceModal'
import {
  FaceValueCard,
  ContributeFaceValueCard,
  MultiSourceMultiTierCard,
  MTAddTierSuccess,
  ProvenanceCTA,
  type ProvenanceCTAKind,
} from '@/components/consumer/price-region'
import { decidePriceRegion } from '@/components/consumer/price-region/lib/decision-tree'

// All five canonical tiers — used by MTAddTierSuccess to derive `remainingTiers`
// from this session's submitted tiers (Q4-eng lock).
const TIER_ENUM: ReadonlyArray<Tier> = ['GA', 'Reserved', 'VIP', 'Pit', 'Lawn']

// Widened read-only view of TIER_ENUM so the type guard can probe arbitrary
// strings — `ReadonlyArray<Tier>.includes` rejects plain strings at the type
// level, and an `as` cast is off the table (CLAUDE.md principle 6).
const TIER_NAMES: ReadonlyArray<string> = TIER_ENUM
const isTierValue = (value: string): value is Tier => TIER_NAMES.includes(value)

// Submitter counts as observation #1 in the 1/2 corroboration model — see
// price_submissions.corroboration_count default in migration 0040, and
// apps/api/src/routes/price-submission-confirms.ts which surfaces
// `confirmsCount` as count-of-non-submitter-confirms (corroborationCount - 1).
// Every UI surface that renders "X of Y confirmed" or "pending · X/Y" must
// add +1 to fold the submitter back in, or the strip lies "0 of 2 confirmed"
// the moment after a user submits (issue #831). Centralised here so the
// math can't drift between call sites again.
const SUBMITTER_OBSERVATION = 1
const displayConfirms = (
  apiConfirmsCount: number,
  localConfirmsBoost = 0,
): number => apiConfirmsCount + SUBMITTER_OBSERVATION + localConfirmsBoost

// Resolves the corroboration-policy denominator from event.date so the
// imminent-show bump (SP_POLICY.confirmsRequiredImminent) is applied
// consistently. Hard-coding `needed: 2` on legacy paths was diverging
// from the rest of the price block — see #835 Copilot R3.
//
// Date math mirrors the server-side `isImminentEvent()` in
// apps/api/src/lib/time.ts: both sides pin to UTC midnight (event.date is
// a YYYY-MM-DD string in the events.date column) so a same-day evening
// show — which `new Date(eventDate) - Date.now()` would round to -1 once
// the day starts in UTC — stays imminent. Keeping the client and server
// in sync avoids the trust strip rendering "1 of 2" while the server
// enforces 3-confirm imminent policy (#835 Copilot R4).
function corroborationConfirmsRequired(eventDate: string): number {
  const parts = eventDate.split('-').map(Number)
  const year = parts[0]
  const month = parts[1]
  const day = parts[2]
  if (year == null || month == null || day == null) {
    return SP_POLICY.confirmsRequired
  }
  const eventMs = Date.UTC(year, month - 1, day)
  const now = new Date()
  const todayMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  )
  const diffDays = (eventMs - todayMs) / (1000 * 60 * 60 * 24)
  const isImminent =
    diffDays >= 0 && diffDays <= SP_POLICY.imminentThresholdDays
  return isImminent
    ? SP_POLICY.confirmsRequiredImminent
    : SP_POLICY.confirmsRequired
}

// ── Shared types ─────────────────────────────────────────────────────

export interface EventDetailSharedProps {
  event: EventDetailResponse
  reports: EventReport[]
  currentUserId: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────

function parseCents(val: string | null | undefined): number | null {
  if (!val) return null
  const parsed = parseFloat(val)
  return isNaN(parsed) ? null : parsed
}

// Derive the pending report of a given status from the reports array
function findPendingReport(
  reports: EventReport[],
  status: EventReport['status'],
): EventReport | null {
  return reports.find((rpt) => rpt.status === status) ?? null
}

// ── EventDetailBanners ───────────────────────────────────────────────
// Renders above the event title: LiveReportBanner when the event is promoted,
// PendingReportBanner when there is an unresolved community report.

export function EventDetailBanners({
  event,
  reports,
  currentUserId: _currentUserId,
}: EventDetailSharedProps) {
  const { getToken } = useAuth()
  const router = useRouter()
  const [confirmSheetOpen, setConfirmSheetOpen] = useState(false)
  const [sawDifferentSheetOpen, setSawDifferentSheetOpen] = useState(false)
  const [evidenceFormOpen, setEvidenceFormOpen] = useState(false)
  const [evidenceFormReportType, setEvidenceFormReportType] = useState<
    'sold-out' | 'cancelled' | 'postponed'
  >('cancelled')

  const pendingCancelledReport = findPendingReport(reports, 'cancelled')
  const pendingPostponedReport = findPendingReport(reports, 'postponed')

  // Promoted status is reflected in event.status — admin resolves reports by promoting them.
  // The GET /reports endpoint only returns unresolved reports (resolvedAt IS NULL),
  // so we derive the live banner from the event itself.
  const liveReportStatus: 'cancelled' | 'postponed' | 'sold-out' | null =
    event.status === 'cancelled'
      ? 'cancelled'
      : event.status === 'postponed'
        ? 'postponed'
        : event.priceStatus === 'soldout'
          ? 'sold-out'
          : null

  // Show pending banner only when the event is NOT already in the promoted state
  const activePendingReport: EventReport | null =
    pendingCancelledReport !== null && event.status !== 'cancelled'
      ? pendingCancelledReport
      : pendingPostponedReport !== null && event.status !== 'postponed'
        ? pendingPostponedReport
        : null

  const handleWithdrawReport = useCallback(
    (reportId: string) => {
      void (async () => {
        const token = await getToken()
        if (!token) return
        try {
          await withdrawEventReport(event.id, reportId, token)
          router.refresh()
        } catch {
          // swallow
        }
      })()
    },
    [event.id, getToken, router],
  )

  const handleConfirmSuccess = useCallback(() => {
    setConfirmSheetOpen(false)
    router.refresh()
  }, [router])

  const handleSawDifferentSelect = useCallback(
    (reportType: 'sold-out' | 'cancelled' | 'postponed') => {
      setSawDifferentSheetOpen(false)
      setEvidenceFormReportType(reportType)
      setEvidenceFormOpen(true)
    },
    [],
  )

  // Nothing to render when no banners are active
  if (liveReportStatus === null && activePendingReport === null) {
    return null
  }

  // liveStatus for the "Saw something different?" ReportSheet — treat the
  // pending report as if it were live so the sheet shows counter options.
  const sawDifferentLiveStatus: 'cancelled' | 'postponed' | null =
    activePendingReport?.status === 'cancelled'
      ? 'cancelled'
      : activePendingReport?.status === 'postponed'
        ? 'postponed'
        : null

  // Derive reporter info from the promoted sold-out report when present
  const liveReporter = (() => {
    if (liveReportStatus === 'sold-out' && event.soldOutReport != null) {
      const handle = event.soldOutReport.reporterHandle
      return handle != null ? { handle, url: '' } : null
    }
    return null
  })()

  const liveConfirmCount = (() => {
    if (liveReportStatus === 'sold-out' && event.soldOutReport != null) {
      return event.soldOutReport.confirmsCount
    }
    return undefined
  })()

  return (
    <>
      {/* Fix 1: mt-3 gap between info block and status cards */}
      <div className="mb-3 mt-3">
        {/* Live (promoted) report banner */}
        {liveReportStatus !== null && (
          <LiveReportBanner
            status={liveReportStatus}
            promotedAt={event.updatedAt}
            {...(liveConfirmCount !== undefined
              ? { confirmCount: liveConfirmCount }
              : {})}
            reporter={liveReporter}
          />
        )}

        {/* Pending community report banner */}
        {activePendingReport !== null && (
          <PendingReportBanner
            kind={
              activePendingReport.status === 'cancelled'
                ? 'cancelled'
                : 'postponed'
            }
            confirms={activePendingReport.confirmsCount + 1}
            needed={activePendingReport.confirmsNeeded}
            view={
              activePendingReport.isReporter
                ? 'reporter'
                : activePendingReport.userHasConfirmed
                  ? 'self-locked'
                  : 'other'
            }
            reportedAt={activePendingReport.createdAt}
            evidenceMethod={activePendingReport.evidenceMethod}
            evidenceUrl={activePendingReport.evidenceUrl}
            reporter={
              activePendingReport.reporterHandle
                ? { handle: activePendingReport.reporterHandle, url: '' }
                : null
            }
            onConfirm={() => setConfirmSheetOpen(true)}
            onWithdraw={() => handleWithdrawReport(activePendingReport.id)}
            onEdit={() => {
              // Edit evidence — future flow
            }}
            onAddEvidence={() => {
              // Add evidence — future flow
            }}
            onSawDifferent={() => setSawDifferentSheetOpen(true)}
          />
        )}
      </div>

      {/* Confirm report sheet */}
      {activePendingReport !== null && (
        <ConfirmReportSheet
          open={confirmSheetOpen}
          onClose={() => setConfirmSheetOpen(false)}
          reportType={
            activePendingReport.status === 'cancelled'
              ? 'cancelled'
              : activePendingReport.status === 'postponed'
                ? 'postponed'
                : 'sold-out'
          }
          reportedAt={activePendingReport.createdAt}
          eventId={event.id}
          reportId={activePendingReport.id}
          reporter={
            activePendingReport.reporterHandle
              ? { handle: activePendingReport.reporterHandle, url: '' }
              : null
          }
          onSuccess={handleConfirmSuccess}
          onFileCounter={() => {
            setConfirmSheetOpen(false)
            setSawDifferentSheetOpen(true)
          }}
        />
      )}

      {/* "Saw something different?" report type sheet */}
      {sawDifferentLiveStatus !== null && (
        <ReportSheet
          open={sawDifferentSheetOpen}
          onClose={() => setSawDifferentSheetOpen(false)}
          liveStatus={sawDifferentLiveStatus}
          eventDate={event.date}
          onSelect={(reportType) => {
            if (
              reportType === 'sold-out' ||
              reportType === 'cancelled' ||
              reportType === 'postponed'
            ) {
              handleSawDifferentSelect(reportType)
            } else {
              setSawDifferentSheetOpen(false)
            }
          }}
        />
      )}

      {/* Evidence form for the counter-report */}
      <EvidenceForm
        open={evidenceFormOpen}
        onClose={() => setEvidenceFormOpen(false)}
        reportType={evidenceFormReportType}
        eventId={event.id}
        eventDate={event.date}
        onSuccess={() => {
          setEvidenceFormOpen(false)
          router.refresh()
        }}
      />
    </>
  )
}

// ── EventDetailPriceBlock ────────────────────────────────────────────
// Conditionally replaces the server-rendered PriceDisplay with a Phase 8.5 card.
// Returns null when the standard PriceDisplay should be shown instead.
//
// Decision tree (first matching wins):
//   1. Pending sold-out report              → PendingSoldOutCard
//   2. Pending cancelled report             → null (price area hidden)
//   3. Live price + alternates              → MultiTierLiveCard
//   4. Single pending submission (no price) → PendingCardB
//   5. Everything else                      → null (let PriceDisplay show)
//
// Note: TwoPendingStack, MixedTierCard, and DisputedPriceCard require the API
// to surface pending submission lists in the event detail response.  Those are
// stubbed here and will be wired once the API exposes that data.

export function EventDetailPriceBlock({
  event,
  reports,
  currentUserId: _currentUserId,
}: EventDetailSharedProps) {
  const { getToken } = useAuth()
  const router = useRouter()
  const [activeCorroborationId, setActiveCorroborationId] = useState<
    string | null
  >(null)
  const [submitPriceOpen, setSubmitPriceOpen] = useState(false)
  const [submitPriceEditMode, setSubmitPriceEditMode] = useState(false)
  const [legacyCorroborationOpen, setLegacyCorroborationOpen] = useState(false)
  const [soldOutSawDifferentOpen, setSoldOutSawDifferentOpen] = useState(false)
  const [soldOutEvidenceFormOpen, setSoldOutEvidenceFormOpen] = useState(false)
  const [soldOutEvidenceReportType, setSoldOutEvidenceReportType] = useState<
    'sold-out' | 'cancelled' | 'postponed'
  >('sold-out')
  // Local confirm counts — incremented optimistically on successful API confirm
  const [localConfirms, setLocalConfirms] = useState<Record<string, number>>({})
  // Local copy of pending submissions — mutated optimistically without a page refresh
  type PendingSubItem = NonNullable<
    EventDetailResponse['pendingSubmissions']
  >[number]
  const [localSubmissions, setLocalSubmissions] = useState<PendingSubItem[]>(
    event.pendingSubmissions ?? [],
  )
  // Q4-eng lock — client-side React session state of "tiers I just submitted
  // in this session." Drives `remainingTiers` for MTAddTierSuccess without
  // a refetch of priceByTier. Resets only when the user clicks Done on the
  // success card (or the modal closes after another submission).
  const [submittedThisSession, setSubmittedThisSession] = useState<Set<Tier>>(
    new Set(),
  )
  const [submitSuccessPayload, setSubmitSuccessPayload] = useState<{
    tier: Tier
    price: number
    sourceCategory: SourceCategory
  } | null>(null)
  // Pre-populates the tier picker when the user clicks "+ Add <tier>" on
  // MTAddTierSuccess. SubmitPriceModal accepts this as an optional prop and
  // seeds formState.tier on open.
  const [preselectedTier, setPreselectedTier] = useState<Tier | null>(null)

  const pendingSoldOutReport = findPendingReport(reports, 'sold-out')
  const pendingCancelledReport = findPendingReport(reports, 'cancelled')

  const priceMin = parseCents(event.ticketPriceMin)
  const priceMax = parseCents(event.ticketPriceMax)

  // Fix 15: postponed confirmed → hide price section entirely
  // Exception: if there's a pending counter-submission we still show it,
  // but in practice postponed + active dispute is unlikely so we keep it simple.
  const isPostponedConfirmed =
    event.status === 'postponed' && event.counterSubmission == null

  const handleConfirmReport = useCallback(
    (reportId: string) => {
      void (async () => {
        const token = await getToken()
        if (!token) return
        try {
          await confirmEventReport(event.id, reportId, token)
          router.refresh()
        } catch {
          // swallow
        }
      })()
    },
    [event.id, getToken, router],
  )

  const handleWithdrawReport = useCallback(
    (reportId: string) => {
      void (async () => {
        const token = await getToken()
        if (!token) return
        try {
          await withdrawEventReport(event.id, reportId, token)
          router.refresh()
        } catch {
          // swallow
        }
      })()
    },
    [event.id, getToken, router],
  )

  // Optimistic localSubmissions updater shared by the two decision-tree
  // branches that render pending-submission cards. A batch submit (#832)
  // yields one row per tier — edits map-replace in place, new rows append
  // as optimistic PendingSubItems.
  const applySubmissionResults = useCallback(
    (results: SubmitPriceResult[]) => {
      setLocalSubmissions((prev) => {
        let next = prev
        for (const result of results) {
          if (result.isEdit) {
            next = next.map((sub) =>
              sub.id === result.id
                ? {
                    ...sub,
                    priceMin: result.priceMin,
                    priceMax: result.priceMax,
                    tier: result.tier,
                    vendor: result.vendor,
                    howFound: result.howFound,
                  }
                : sub,
            )
          } else {
            next = [
              ...next,
              {
                id: result.id,
                priceMin: result.priceMin,
                priceMax: result.priceMax,
                tier: result.tier,
                vendor: result.vendor,
                howFound: result.howFound,
                sourceCategory: result.sourceCategory,
                note: null,
                submitterHandle: null,
                submittedAt: new Date().toISOString(),
                confirmsCount: 0,
                // Use the shared helper so the local-submission optimistic row
                // picks up the UTC-midnight-correct imminent-policy denominator
                // (#835 Copilot R5).
                confirmsNeeded: corroborationConfirmsRequired(event.date),
                isSubmitter: true,
              },
            ]
          }
        }
        return next
      })
    },
    [event.date],
  )

  // Shared submit-success handler — used by every new decision-tree branch
  // that owns a SubmitPriceModal. A batch submit (#832) returns one row per
  // tier: the follow-up card shows the first row, and every submitted tier
  // joins the session set so the add-tier pills exclude all of them. Falls
  // back to GA when a tier comes back non-canonical so the picker still
  // shows something useful.
  const handleSubmitSuccess = useCallback((results: SubmitPriceResult[]) => {
    const newRows = results.filter((row) => !row.isEdit)
    const firstRow = newRows[0]
    if (!firstRow) return
    const submittedTiers = newRows.map((row): Tier =>
      isTierValue(row.tier) ? row.tier : 'GA',
    )
    const firstTier: Tier = isTierValue(firstRow.tier) ? firstRow.tier : 'GA'
    const price = Math.round(parseFloat(firstRow.priceMin))
    const sourceCategory: SourceCategory = firstRow.sourceCategory ?? 'standard'
    setSubmittedThisSession((prev) => {
      const next = new Set(prev)
      for (const tier of submittedTiers) {
        next.add(tier)
      }
      return next
    })
    setSubmitSuccessPayload({ tier: firstTier, price, sourceCategory })
    setSubmitPriceOpen(false)
    setPreselectedTier(null)
  }, [])

  // Submit-success surface — Submit-success state #1 (post-submit add-tier).
  // The MTAddTierSuccess follow-up is a GLOBAL after-submit affordance:
  // every decision branch that owns a SubmitPriceModal must show the tier
  // pill follow-up, not the modal's internal SuccessState. Lifted here so
  // each branch can inject the same JSX without duplicating the wiring.
  // Returns null when there's no payload, so callers can drop it in with
  // no guard at the call site.
  const submitSuccessSurface =
    submitSuccessPayload !== null ? (
      <div className="mt-3">
        <MTAddTierSuccess
          submittedTier={submitSuccessPayload.tier}
          submittedPrice={submitSuccessPayload.price}
          submittedSourceCategory={submitSuccessPayload.sourceCategory}
          remainingTiers={TIER_ENUM.filter(
            (tier) => !submittedThisSession.has(tier),
          )}
          onAddTier={(tier) => {
            setSubmitSuccessPayload(null)
            setPreselectedTier(tier)
            setSubmitPriceOpen(true)
          }}
          onDone={() => setSubmitSuccessPayload(null)}
        />
      </div>
    ) : null

  // ── Fix 15: postponed confirmed → hide price section ───────────
  if (isPostponedConfirmed) {
    return null
  }

  // ── 0. Promoted sold-out (confirmed by community) ──────────────
  // First-strike precedence (per plan Task 9 step 3): when admin has
  // promoted a community-confirmed sold-out report, render the reporter
  // caption card alone. The new decision-tree branches below only fire
  // when `priceStatus === 'soldout'` AND `soldOutReport == null` (i.e.
  // sold-out flagged by another path).
  if (event.priceStatus === 'soldout' && event.soldOutReport != null) {
    const soldOut = event.soldOutReport
    return (
      <SoldOutPriceCard
        priceMin={priceMin}
        priceMax={priceMax}
        reporterHandle={soldOut.reporterHandle}
        confirmsCount={soldOut.confirmsCount}
        reportedAt={soldOut.reportedAt}
      />
    )
  }

  // ── 0b. New decision-tree branches (property-table §8 states #3, #10–13) ─
  // Pure-function helper returns a tagged union; only the new states route
  // through this block. All other state still falls into the legacy
  // branches below — promoted sold-out + counter-submission + pending-report
  // logic stays intact during the migration window.
  const priceDecision = decidePriceRegion({ event })
  if (priceDecision.kind === 'sold-out-resale') {
    return (
      <>
        <SoldOutPriceCard
          priceMin={priceMin}
          priceMax={priceMax}
          reporterHandle={null}
          confirmsCount={0}
          reportedAt={event.priceObservedAt ?? new Date().toISOString()}
        />
        <div className="mt-3">
          <FaceValueCard
            variant="default"
            resaleVendor={priceDecision.faceValueResaleVendor}
            {...(priceDecision.faceValueResaleRange !== undefined
              ? { resaleRange: priceDecision.faceValueResaleRange }
              : {})}
            onAddPrice={() => setSubmitPriceOpen(true)}
          />
        </div>
        <div className="mt-3">
          <ProvenanceCTA
            kind="resale"
            vendor={priceDecision.resaleLink.vendor ?? 'Resale'}
            href={priceDecision.resaleLink.url}
            outline
          />
        </div>
        {submitSuccessSurface}
        <SubmitPriceModal
          open={submitPriceOpen}
          onClose={() => {
            setSubmitPriceOpen(false)
            setSubmitSuccessPayload(null)
          }}
          openInEditMode={false}
          preselectedTier={preselectedTier}
          eventId={event.id}
          artist={event.artist}
          venueName={event.venue.name}
          date={event.date}
          onSuccess={handleSubmitSuccess}
        />
      </>
    )
  }

  if (priceDecision.kind === 'sold-out-contribute') {
    return (
      <>
        <SoldOutPriceCard variant="no-listing" />
        <div className="mt-3">
          <ContributeFaceValueCard
            onAddPrice={() => setSubmitPriceOpen(true)}
          />
        </div>
        {submitSuccessSurface}
        <SubmitPriceModal
          open={submitPriceOpen}
          onClose={() => {
            setSubmitPriceOpen(false)
            setSubmitSuccessPayload(null)
          }}
          openInEditMode={false}
          preselectedTier={preselectedTier}
          eventId={event.id}
          artist={event.artist}
          venueName={event.venue.name}
          date={event.date}
          onSuccess={handleSubmitSuccess}
        />
      </>
    )
  }

  if (priceDecision.kind === 'no-price-resale') {
    return (
      <>
        <PriceDisplay
          priceMin={event.ticketPriceMin}
          priceMax={event.ticketPriceMax}
          priceSource={event.priceSource}
          venueName={event.venue.name}
          ticketUrl={event.ticketUrl}
          eventId={event.id}
          artist={event.artist}
          date={event.date}
          priceStatus={event.priceStatus ?? null}
          ticketPriceOpenedAt={event.ticketPriceOpenedAt ?? null}
          ticketFees={event.ticketFees ?? null}
          priceVendor={event.priceVendor ?? null}
          priceSubmitterHandle={event.priceSubmitterHandle ?? null}
          priceObservedAt={event.priceObservedAt ?? null}
          priceApprovalKind={event.priceApprovalKind ?? null}
          priceApprovedAt={event.priceApprovedAt ?? null}
          priceAlternates={event.priceAlternates ?? null}
          onSubmitPrice={() => setSubmitPriceOpen(true)}
        />
        <div className="mt-3">
          <FaceValueCard
            variant="no-price"
            resaleVendor={priceDecision.faceValueResaleVendor}
            onAddPrice={() => setSubmitPriceOpen(true)}
          />
        </div>
        <div className="mt-3">
          <ProvenanceCTA
            kind="resale"
            vendor={priceDecision.resaleLink.vendor ?? 'Resale'}
            href={priceDecision.resaleLink.url}
            outline
          />
        </div>
        {submitSuccessSurface}
        <SubmitPriceModal
          open={submitPriceOpen}
          onClose={() => {
            setSubmitPriceOpen(false)
            setSubmitSuccessPayload(null)
          }}
          openInEditMode={false}
          preselectedTier={preselectedTier}
          eventId={event.id}
          artist={event.artist}
          venueName={event.venue.name}
          date={event.date}
          onSuccess={handleSubmitSuccess}
        />
      </>
    )
  }

  if (priceDecision.kind === 'resale-headline') {
    // STATE #3 — at least one tier headline is resale AND no boxoffice/
    // standard headline anywhere. Render MultiTierLiveCard with kind='resale'
    // + show-level FaceValueCard inviting box-office contribution + outbound
    // resale ProvenanceCTA.
    const blocks = priceDecision.priceByTier
    const headlineBlock =
      blocks.find((block) => block.headline?.sourceCategory === 'resale') ??
      blocks[0]
    const headlineRow = headlineBlock?.headline
    const headlineFloor = headlineRow ? parseFloat(headlineRow.priceMin) : 0
    const headlineCeiling =
      headlineRow?.priceMax != null ? parseFloat(headlineRow.priceMax) : null
    const headlineVendor = headlineRow?.vendor ?? event.venue.name
    const otherBlocks = blocks.filter((block) => block !== headlineBlock)
    const alternates = otherBlocks.map((block) => {
      const altHeadline = block.headline
      if (altHeadline != null) {
        return {
          tier: block.tier,
          vendor: altHeadline.vendor,
          floor: parseFloat(altHeadline.priceMin),
          ...(altHeadline.priceMax != null
            ? { ceiling: parseFloat(altHeadline.priceMax) }
            : {}),
          kind:
            altHeadline.sourceCategory === 'boxoffice'
              ? ('boxoffice' as const)
              : altHeadline.sourceCategory === 'resale'
                ? ('resale' as const)
                : ('community' as const),
        }
      }
      const firstAlt = block.alternates[0]
      if (firstAlt != null) {
        return {
          tier: block.tier,
          vendor: firstAlt.vendor,
          floor: parseFloat(firstAlt.priceMin),
          ...(firstAlt.priceMax != null
            ? { ceiling: parseFloat(firstAlt.priceMax) }
            : {}),
          kind: null as null,
        }
      }
      const firstPending = block.pending[0]
      return {
        tier: block.tier,
        vendor: firstPending?.vendor ?? 'Community',
        floor: firstPending ? parseFloat(firstPending.priceMin) : 0,
        ...(firstPending?.priceMax != null
          ? { ceiling: parseFloat(firstPending.priceMax) }
          : {}),
        kind: null as null,
        pending: true as const,
        // Submitter counts as observation #1 (#831). The API surfaces
        // `confirmsCount` as non-submitter confirms, so fold the submitter
        // back in before rendering "pending · X/Y".
        // When firstPending is null the tier has no submission yet — show 0
        // confirms, not the submitter-observation baseline. The submitter
        // bump only applies once a real pending submission exists (#835
        // Copilot R2).
        confirms:
          firstPending != null
            ? displayConfirms(firstPending.confirmsCount)
            : 0,
        needed: firstPending?.confirmsNeeded ?? SP_POLICY.confirmsRequired,
      }
    })

    // Find a resale ticketLink for the outbound CTA; fall back to the headline
    // vendor when no link is surfaced.
    const resaleLink =
      event.ticketLinks?.find((link) => link.kind === 'resale') ?? null

    return (
      <>
        <MultiTierLiveCard
          headline={{
            floor: headlineFloor,
            ...(headlineCeiling !== null ? { ceiling: headlineCeiling } : {}),
            tier: headlineBlock?.tier ?? 'GA',
            vendor: headlineVendor,
            kind: 'resale',
          }}
          alternates={alternates}
          {...(headlineBlock?.reports !== undefined
            ? { reports: headlineBlock.reports }
            : {})}
        />
        <div className="mt-3">
          <FaceValueCard
            variant="no-price"
            resaleVendor={priceDecision.faceValueResaleVendor}
            onAddPrice={() => setSubmitPriceOpen(true)}
          />
        </div>
        {resaleLink !== null && (
          <div className="mt-3">
            <ProvenanceCTA
              kind="resale"
              vendor={resaleLink.vendor ?? 'Resale'}
              href={resaleLink.url}
              outline
            />
          </div>
        )}
        {submitSuccessSurface}
        <SubmitPriceModal
          open={submitPriceOpen}
          onClose={() => {
            setSubmitPriceOpen(false)
            setSubmitSuccessPayload(null)
          }}
          openInEditMode={false}
          preselectedTier={preselectedTier}
          eventId={event.id}
          artist={event.artist}
          venueName={event.venue.name}
          date={event.date}
          onSuccess={handleSubmitSuccess}
        />
      </>
    )
  }

  if (priceDecision.kind === 'multi-source-mixed') {
    const { entryBlock, crossSourceAlt, otherTiers } = priceDecision
    const headlineRow = entryBlock.headline
    const headlineFloor = headlineRow
      ? Math.round(parseFloat(headlineRow.priceMin))
      : 0
    const crossKind: 'boxoffice' | 'resale' | 'community' =
      crossSourceAlt.sourceCategory === 'boxoffice'
        ? 'boxoffice'
        : crossSourceAlt.sourceCategory === 'resale'
          ? 'resale'
          : 'community'
    const otherTierRows = otherTiers.map((block) => {
      const altHeadline = block.headline ?? block.alternates[0] ?? null
      const altFloor = altHeadline
        ? parseFloat(
            'priceMin' in altHeadline
              ? altHeadline.priceMin
              : String(altHeadline),
          )
        : 0
      const altCeilingStr =
        altHeadline && 'priceMax' in altHeadline ? altHeadline.priceMax : null
      const altKind: 'boxoffice' | 'resale' | 'community' | null = altHeadline
        ? altHeadline.sourceCategory === 'boxoffice'
          ? 'boxoffice'
          : altHeadline.sourceCategory === 'resale'
            ? 'resale'
            : altHeadline.sourceCategory === 'standard'
              ? 'community'
              : null
        : null
      return {
        tier: block.tier,
        vendor: altHeadline?.vendor ?? 'Community',
        floor: altFloor,
        ...(altCeilingStr != null
          ? { ceiling: parseFloat(altCeilingStr) }
          : {}),
        kind: altKind,
      }
    })
    return (
      <MultiSourceMultiTierCard
        headlineTier={entryBlock.tier}
        headlinePrice={headlineFloor}
        headlineVendor={headlineRow?.vendor ?? event.venue.name}
        crossSource={{
          source: crossSourceAlt.vendor,
          kind: crossKind,
          price: Math.round(parseFloat(crossSourceAlt.priceMin)),
        }}
        otherTiers={otherTierRows}
      />
    )
  }

  if (priceDecision.kind === 'mixed-tier') {
    // STATE #6 — at least one tier has a headline, at least one other tier
    // is pending-only. Render shipped MixedTierCard with per-tier pending
    // tells. Pick the cheapest headline tier as the card headline, route
    // every other block through TierAlternateRow.
    const blocks = priceDecision.priceByTier
    const headlineBlock =
      blocks.find((block) => block.headline !== null) ?? blocks[0]
    const headlineRow = headlineBlock?.headline
    if (headlineRow != null && headlineBlock != null) {
      const headlineFloor = parseFloat(headlineRow.priceMin)
      const headlineCeiling =
        headlineRow.priceMax != null ? parseFloat(headlineRow.priceMax) : null
      const headlineKind: 'boxoffice' | 'resale' | 'community' =
        headlineRow.sourceCategory === 'boxoffice'
          ? 'boxoffice'
          : headlineRow.sourceCategory === 'resale'
            ? 'resale'
            : 'community'
      const otherBlocks = blocks.filter((block) => block !== headlineBlock)
      const alternateRows = otherBlocks.map((block) => {
        // Headline-bearing tier → render as alternate row (resolved tier).
        if (block.headline != null) {
          const altKind: 'boxoffice' | 'resale' | 'community' =
            block.headline.sourceCategory === 'boxoffice'
              ? 'boxoffice'
              : block.headline.sourceCategory === 'resale'
                ? 'resale'
                : 'community'
          return {
            tier: block.tier,
            vendor: block.headline.vendor,
            floor: parseFloat(block.headline.priceMin),
            ...(block.headline.priceMax != null
              ? { ceiling: parseFloat(block.headline.priceMax) }
              : {}),
            kind: altKind,
          }
        }
        // Pending-only tier → render the cheapest pending row with the
        // per-tier pending tell (`pending · N/needed`).
        const firstPending = block.pending[0]
        const pendingKind: 'boxoffice' | 'community' | null = firstPending
          ? firstPending.vendor === 'VenueBoxOffice'
            ? 'boxoffice'
            : 'community'
          : null
        return {
          tier: block.tier,
          vendor: firstPending?.vendor ?? 'Community',
          floor: firstPending ? parseFloat(firstPending.priceMin) : 0,
          ...(firstPending?.priceMax != null
            ? { ceiling: parseFloat(firstPending.priceMax) }
            : {}),
          kind: pendingKind,
          pending: true as const,
          // Submitter counts as observation #1 (#831). See displayConfirms()
          // doc at the top of this file. When firstPending is null the tier
          // has no submission — show 0 confirms, not the submitter baseline
          // (#835 Copilot R2).
          confirms:
            firstPending != null
              ? displayConfirms(firstPending.confirmsCount)
              : 0,
          needed: firstPending?.confirmsNeeded ?? SP_POLICY.confirmsRequired,
        }
      })
      return (
        <>
          <MixedTierCard
            headline={{
              floor: headlineFloor,
              ...(headlineCeiling !== null ? { ceiling: headlineCeiling } : {}),
              tier: headlineBlock.tier,
              vendor: headlineRow.vendor,
              kind: headlineKind,
            }}
            alternates={alternateRows}
          />
          {submitSuccessSurface}
          <SubmitPriceModal
            open={submitPriceOpen}
            onClose={() => {
              setSubmitPriceOpen(false)
              setPreselectedTier(null)
            }}
            openInEditMode={false}
            preselectedTier={preselectedTier}
            eventId={event.id}
            artist={event.artist}
            venueName={event.venue.name}
            date={event.date}
            onSuccess={handleSubmitSuccess}
          />
        </>
      )
    }
  }

  if (priceDecision.kind === 'all-tiers-pending') {
    // STATE #7 — every tier is pending-only. Stack the per-tier first-pending
    // rows in TwoPendingStack (handles 1–2 well; degrades gracefully on >2 by
    // showing the first two — same shipped behavior as the legacy path below).
    const blocks = priceDecision.priceByTier
    const cardPropsList: Array<React.ComponentProps<typeof PendingCardB>> = []
    // Flat lookup of (tier, pending entry) keyed by pending id so the
    // CorroborationSheet at the bottom of this branch can resolve from
    // `activeCorroborationId` without re-walking blocks each render.
    const pendingByIdAtt: Array<{
      id: string
      tier: Tier
      pending: (typeof blocks)[number]['pending'][number]
    }> = []
    for (const block of blocks) {
      const firstPending = block.pending[0]
      if (firstPending == null) continue
      pendingByIdAtt.push({
        id: firstPending.id,
        tier: block.tier,
        pending: firstPending,
      })
      const isBoxOffice = firstPending.vendor === 'VenueBoxOffice'
      cardPropsList.push({
        floor: parseFloat(firstPending.priceMin),
        ...(firstPending.priceMax != null
          ? { ceiling: parseFloat(firstPending.priceMax) }
          : {}),
        tier: block.tier,
        vendor: firstPending.vendor,
        kind: isBoxOffice ? 'boxoffice' : 'community',
        submitter: firstPending.submitterHandle
          ? { handle: firstPending.submitterHandle, url: '' }
          : null,
        submittedAt: firstPending.submittedAt,
        // Submitter counts as observation #1 (#831). Helper folds the
        // submitter into the API's non-submitter `confirmsCount`.
        confirms: displayConfirms(firstPending.confirmsCount),
        needed: firstPending.confirmsNeeded,
        view: firstPending.isSubmitter ? 'submitter' : 'other',
        note: firstPending.note,
        ...(block.counterSubmission != null
          ? {
              counterPointer: {
                href: `#counter-${block.counterSubmission.id}`,
              },
            }
          : {}),
        lastAdminActionKind:
          block.counterSubmission?.lastAdminActionKind ?? null,
        // Confirm opens the CorroborationSheet (same flow as the legacy
        // pendingSubmissions path — see line ~1326).
        onConfirm: () => setActiveCorroborationId(firstPending.id),
        // Withdraw → DELETE /v1/submissions/:id, then router.refresh() to
        // re-fetch the server-rendered event detail. The legacy path uses
        // setLocalSubmissions because it owns React state; this branch is
        // driven by `event.priceByTier` (server prop), so we invalidate via
        // a router refresh instead.
        onWithdraw: () => {
          void (async () => {
            const token = await getToken()
            if (!token) return
            try {
              const res = await fetch(
                `${process.env['NEXT_PUBLIC_API_URL']}/v1/submissions/${firstPending.id}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                },
              )
              if (res.ok) {
                router.refresh()
              } else {
                console.error('Withdraw failed', res.status)
              }
            } catch (err) {
              console.error('Withdraw failed', err)
            }
          })()
        },
        onEdit: () => {
          setSubmitPriceEditMode(true)
          setSubmitPriceOpen(true)
        },
      })
    }
    const activeAtt =
      activeCorroborationId !== null
        ? (pendingByIdAtt.find((row) => row.id === activeCorroborationId) ??
          null)
        : null
    return (
      <>
        <TwoPendingStack cards={cardPropsList} />
        {activeAtt !== null && (
          <CorroborationSheet
            submission={{
              floor: parseFloat(activeAtt.pending.priceMin),
              ...(activeAtt.pending.priceMax !== null
                ? { ceiling: parseFloat(activeAtt.pending.priceMax) }
                : {}),
              tier: activeAtt.tier,
              vendor: activeAtt.pending.vendor,
              kind:
                activeAtt.pending.vendor === 'VenueBoxOffice'
                  ? 'boxoffice'
                  : 'community',
              submitter: activeAtt.pending.submitterHandle
                ? { handle: activeAtt.pending.submitterHandle, url: '' }
                : null,
              submittedAt: activeAtt.pending.submittedAt,
              // Submitter counts as observation #1 (#831). Same helper as
              // the strip on the PendingCardB this sheet was opened from —
              // keeping the count in sync between card and sheet.
              confirms: displayConfirms(activeAtt.pending.confirmsCount),
              needed: activeAtt.pending.confirmsNeeded,
              note: activeAtt.pending.note,
              submissionId: activeAtt.pending.id,
            }}
            open={activeCorroborationId !== null}
            onClose={() => setActiveCorroborationId(null)}
            onConfirm={(method) => {
              const confirmedId = activeAtt.pending.id
              setActiveCorroborationId(null)
              void (async () => {
                const token = await getToken()
                if (!token) return
                try {
                  const res = await fetch(
                    `${process.env['NEXT_PUBLIC_API_URL']}/v1/events/${event.id}/price-submissions/${confirmedId}/confirm`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ method }),
                    },
                  )
                  if (res.ok) {
                    router.refresh()
                  } else {
                    console.error('Confirm failed', res.status)
                  }
                } catch (err) {
                  console.error(
                    'EventDetailPriceBlock: price confirm failed',
                    err,
                  )
                }
              })()
            }}
            onSubmitUpdate={() => {
              setActiveCorroborationId(null)
              setSubmitPriceOpen(true)
            }}
          />
        )}
        {submitSuccessSurface}
        <SubmitPriceModal
          open={submitPriceOpen}
          onClose={() => {
            setSubmitPriceOpen(false)
            setPreselectedTier(null)
            setSubmitPriceEditMode(false)
          }}
          openInEditMode={submitPriceEditMode}
          preselectedTier={preselectedTier}
          eventId={event.id}
          artist={event.artist}
          venueName={event.venue.name}
          date={event.date}
          onSuccess={handleSubmitSuccess}
        />
      </>
    )
  }

  if (priceDecision.kind === 'multi-tier-shipped') {
    // Multi-tier path that goes through the new priceByTier API.
    // Kept side-by-side with the legacy flat-field MixedTierCard branch
    // below until the migration is verified — eventually that branch
    // becomes unreachable when priceByTier is non-null.
    const blocks = priceDecision.priceByTier
    const headlineBlock = blocks[0]
    const headlineRow = headlineBlock?.headline
    if (headlineRow != null && headlineBlock != null) {
      const headlineFloor = parseFloat(headlineRow.priceMin)
      const headlineCeiling =
        headlineRow.priceMax != null ? parseFloat(headlineRow.priceMax) : null
      const headlineKind: 'boxoffice' | 'resale' | 'community' =
        headlineRow.sourceCategory === 'boxoffice'
          ? 'boxoffice'
          : headlineRow.sourceCategory === 'resale'
            ? 'resale'
            : 'community'
      const alternateRows = blocks.slice(1).map((block) => {
        const altHeadline = block.headline ?? block.alternates[0] ?? null
        const altFloor = altHeadline ? parseFloat(altHeadline.priceMin) : 0
        const altCeilingStr = altHeadline?.priceMax ?? null
        const altKind: 'boxoffice' | 'resale' | 'community' | null = altHeadline
          ? altHeadline.sourceCategory === 'boxoffice'
            ? 'boxoffice'
            : altHeadline.sourceCategory === 'resale'
              ? 'resale'
              : 'community'
          : null
        return {
          tier: block.tier,
          vendor: altHeadline?.vendor ?? 'Community',
          floor: altFloor,
          ...(altCeilingStr != null
            ? { ceiling: parseFloat(altCeilingStr) }
            : {}),
          kind: altKind,
        }
      })
      const outboundLink = event.ticketLinks?.[0] ?? null
      const outboundKind: ProvenanceCTAKind | null = outboundLink
        ? outboundLink.kind === 'boxoffice'
          ? 'boxoffice'
          : outboundLink.kind === 'resale'
            ? 'resale'
            : 'primary'
        : null
      return (
        <>
          <MultiTierLiveCard
            headline={{
              floor: headlineFloor,
              ...(headlineCeiling !== null ? { ceiling: headlineCeiling } : {}),
              tier: headlineBlock.tier,
              vendor: headlineRow.vendor,
              kind: headlineKind,
            }}
            alternates={alternateRows}
            reports={headlineBlock.reports}
          />
          {outboundLink !== null && outboundKind !== null && (
            <div className="mt-3">
              <ProvenanceCTA
                kind={outboundKind}
                vendor={outboundLink.vendor ?? event.venue.name}
                href={outboundLink.url}
                outline={outboundKind === 'resale'}
              />
            </div>
          )}
          {submitSuccessSurface}
          <SubmitPriceModal
            open={submitPriceOpen}
            onClose={() => {
              setSubmitPriceOpen(false)
              setPreselectedTier(null)
            }}
            openInEditMode={false}
            preselectedTier={preselectedTier}
            eventId={event.id}
            artist={event.artist}
            venueName={event.venue.name}
            date={event.date}
            onSuccess={handleSubmitSuccess}
          />
        </>
      )
    }
  }

  // priceDecision.kind === 'no-price-empty' — fall through to the existing
  // legacy branches below. (Any input the decision tree doesn't match for —
  // e.g. priceByTier null + non-soldout + no resale link other than the
  // explicit no-price-empty case — also falls through to the legacy if-tree.)

  // ── 1. Pending sold-out report ──────────────────────────────────
  if (pendingSoldOutReport !== null) {
    const soldOutView = pendingSoldOutReport.isReporter ? 'reporter' : 'other'

    return (
      <>
        <PendingSoldOutCard
          floor={priceMin ?? 0}
          {...(priceMax !== null && priceMax !== undefined
            ? { ceiling: priceMax }
            : {})}
          vendor={event.priceVendor ?? event.venue.name}
          reporter={null}
          reportedAt={pendingSoldOutReport.createdAt}
          confirms={pendingSoldOutReport.confirmsCount}
          needed={pendingSoldOutReport.confirmsNeeded}
          view={soldOutView}
          userHasConfirmed={pendingSoldOutReport.userHasConfirmed}
          evidenceMethod={pendingSoldOutReport.evidenceMethod}
          evidenceUrl={pendingSoldOutReport.evidenceUrl}
          note={pendingSoldOutReport.note}
          onConfirm={() => handleConfirmReport(pendingSoldOutReport.id)}
          onWithdraw={() => handleWithdrawReport(pendingSoldOutReport.id)}
          onEdit={() => {
            // Placeholder — edit sold-out report evidence
          }}
          onSawDifferent={() => setSoldOutSawDifferentOpen(true)}
        />

        {/* Fix 8: "Tickets still available?" → opens a ReportSheet → EvidenceForm */}
        <ReportSheet
          open={soldOutSawDifferentOpen}
          onClose={() => setSoldOutSawDifferentOpen(false)}
          liveStatus="sold-out"
          eventDate={event.date}
          onSelect={(reportType) => {
            setSoldOutSawDifferentOpen(false)
            if (
              reportType === 'sold-out' ||
              reportType === 'cancelled' ||
              reportType === 'postponed'
            ) {
              setSoldOutEvidenceReportType(reportType)
              setSoldOutEvidenceFormOpen(true)
            }
          }}
        />
        <EvidenceForm
          open={soldOutEvidenceFormOpen}
          onClose={() => setSoldOutEvidenceFormOpen(false)}
          reportType={soldOutEvidenceReportType}
          eventId={event.id}
          eventDate={event.date}
          onSuccess={() => {
            setSoldOutEvidenceFormOpen(false)
            router.refresh()
          }}
        />
      </>
    )
  }

  // ── 2. Pending cancelled report → hide price area ───────────────
  if (pendingCancelledReport !== null && event.status !== 'cancelled') {
    // The PriceDisplay is suppressed server-side too (event.status check in page.tsx).
    // Return null here as a belt-and-suspenders measure.
    return null
  }

  // ── 3a. Live price + pending counter-submission → DisputedPriceCard ─
  if (
    event.counterSubmission != null &&
    priceMin !== null &&
    event.priceStatus !== 'soldout'
  ) {
    const counter = event.counterSubmission
    const liveKind: 'community' | 'boxoffice' =
      event.priceApprovalKind === 'admin' ? 'boxoffice' : 'community'
    return (
      <DisputedPriceCard
        floor={priceMin}
        {...(priceMax !== null ? { ceiling: priceMax } : {})}
        tier={event.priceVendor ?? 'GA'}
        vendor={event.priceVendor ?? event.venue.name}
        kind={liveKind}
        submitter={
          event.priceSubmitterHandle
            ? { handle: event.priceSubmitterHandle }
            : null
        }
        liveSubmittedAt={event.priceObservedAt ?? new Date().toISOString()}
        confirmsCount={event.priceConfirmsCount ?? 0}
        disputer={counter.submitter}
        disputeFloor={counter.floor}
        {...(counter.ceiling !== undefined
          ? { disputeCeiling: counter.ceiling }
          : {})}
        disputedAt={counter.submittedAt}
        counterSubmissionId={counter.id}
        lastAdminActionKind={counter.lastAdminActionKind ?? null}
        eventId={event.id}
        disputedSubmissionId={counter.parentSubmissionId}
        onUpdateSuccess={() => router.refresh()}
      />
    )
  }

  // ── 3. Live price with alternates → MultiTierLiveCard ───────────
  const alternates = event.priceAlternates ?? []
  if (
    priceMin !== null &&
    alternates.length > 0 &&
    event.priceStatus !== 'soldout'
  ) {
    const headlineKind: 'community' | 'boxoffice' =
      event.priceApprovalKind === 'admin' ? 'boxoffice' : 'community'
    const headline = {
      floor: priceMin,
      ...(priceMax !== null ? { ceiling: priceMax } : {}),
      tier: 'General Admission',
      vendor: event.priceVendor ?? event.venue.name,
      kind: headlineKind,
    }

    const alternateRows = alternates.map((alt) => ({
      tier: 'General Admission',
      vendor: alt.vendor ?? 'Community',
      floor: parseFloat(alt.priceMin),
      ...(alt.priceMax !== null ? { ceiling: parseFloat(alt.priceMax) } : {}),
      kind: null as 'community' | 'boxoffice' | null,
    }))

    return (
      <>
        <MixedTierCard headline={headline} alternates={alternateRows} />
        {/* Fix 14: hide SubmitPriceCardCta for cancelled events */}
        {event.status !== 'cancelled' && (
          <div className="mt-3">
            <SubmitPriceCardCta
              eventId={event.id}
              artist={event.artist}
              venueName={event.venue.name}
              date={event.date}
            />
          </div>
        )}
      </>
    )
  }

  // ── 4a. Pending submissions — no corroborated price yet ──────────
  // Guard enters on server submissions OR client-tracked ones (e.g. user just
  // submitted and localSubmissions was updated without a page refresh).
  if (
    (event.pendingSubmissions != null && event.pendingSubmissions.length > 0) ||
    localSubmissions.length > 0
  ) {
    // Use localSubmissions as the source of truth — it starts from server data
    // and is updated optimistically on submit, edit, and withdraw.
    if (localSubmissions.length === 0) {
      return (
        <SubmitPriceCardCta
          eventId={event.id}
          artist={event.artist}
          venueName={event.venue.name}
          date={event.date}
        />
      )
    }

    const visibleSubs = localSubmissions

    // If any submission has met the API's promotion threshold, render as live.
    // Compare actual observations (submitter as #1 + non-submitter confirms +
    // this session's localConfirms) against confirmsNeeded — matches
    // price-submission-confirms.ts promotion logic which compares
    // corroboration_count (default 1 for the submitter) against
    // confirmsRequired. Without folding the submitter in, the UI would still
    // render pending after the server already promoted (#831).
    const confirmedSub = visibleSubs.find(
      (sub) =>
        displayConfirms(sub.confirmsCount, localConfirms[sub.id] ?? 0) >=
        sub.confirmsNeeded,
    )
    if (confirmedSub != null) {
      // PriceDisplay's `priceConfirmsCount` renders "N fans confirmed" — that
      // copy means non-submitter peers, so DON'T fold the submitter in here
      // (separate from the X/Y trust-strip semantic the displayConfirms()
      // helper covers).
      const confirmsDisplay =
        confirmedSub.confirmsCount + (localConfirms[confirmedSub.id] ?? 0)
      return (
        <>
          <PriceDisplay
            priceMin={confirmedSub.priceMin}
            priceMax={confirmedSub.priceMax}
            priceSource="community"
            venueName={event.venue.name}
            ticketUrl={event.ticketUrl}
            eventId={event.id}
            artist={event.artist}
            date={event.date}
            priceStatus="live"
            priceVendor={confirmedSub.vendor}
            priceSubmitterHandle={confirmedSub.submitterHandle}
            priceObservedAt={confirmedSub.submittedAt}
            priceApprovalKind="fan"
            priceApprovedAt={confirmedSub.submittedAt}
            priceAlternates={null}
            priceConfirmsCount={confirmsDisplay}
          />
          {/* Fix 14: hide SubmitPriceCardCta for cancelled events */}
          {event.status !== 'cancelled' && (
            <div className="mt-3">
              <SubmitPriceCardCta
                eventId={event.id}
                artist={event.artist}
                venueName={event.venue.name}
                date={event.date}
              />
            </div>
          )}
        </>
      )
    }

    const activeCorroboration =
      activeCorroborationId !== null
        ? (visibleSubs.find((sub) => sub.id === activeCorroborationId) ?? null)
        : null

    // Per-tier counter pointer (LOCKED §9 Q3). When a tier already has a
    // counter-submission, `view === 'other'` PendingCardB cards REPLACE the
    // dispute affordance with a deep-link to the counter card instead of
    // letting the user start a duplicate dispute form (would 409 — schema
    // enforces one counter per parent).
    //
    // pendingSubmissions.tier is typed as `string` on the wire (legacy shape),
    // so the helper accepts string and matches against priceByTier.tier
    // (typed `Tier`). Non-canonical tier strings yield no match → null.
    const counterPointerFor = (tier: string): { href: string } | null => {
      const block = event.priceByTier?.find((blk) => blk.tier === tier)
      if (block?.counterSubmission == null) return null
      return { href: `#counter-${block.counterSubmission.id}` }
    }

    // §8 state #18 — surfaces the admin defer engagement signal on the
    // PendingCardB that sits alongside a counter. Falls back to null when
    // there's no counter for the tier or the counter has no admin action.
    const lastAdminActionKindFor = (tier: string): 'defer' | null => {
      const block = event.priceByTier?.find((blk) => blk.tier === tier)
      return block?.counterSubmission?.lastAdminActionKind ?? null
    }

    const pendingCardProps = visibleSubs.map((sub) => {
      // Submitter counts as observation #1 (#831). Helper folds the submitter
      // into the API's non-submitter `confirmsCount`; `localConfirms[id]` is
      // this session's optimistic boost from clicking "Confirm price".
      const subConfirms = displayConfirms(
        sub.confirmsCount,
        localConfirms[sub.id] ?? 0,
      )
      const isBoxOffice = sub.vendor === 'VenueBoxOffice'
      const viewKind: 'other' | 'submitter' | 'self-locked' = sub.isSubmitter
        ? 'submitter'
        : 'other'
      const props: React.ComponentProps<typeof PendingCardB> = {
        floor: parseFloat(sub.priceMin),
        ...(sub.priceMax !== null ? { ceiling: parseFloat(sub.priceMax) } : {}),
        tier: sub.tier,
        vendor: sub.vendor,
        kind: isBoxOffice ? 'boxoffice' : 'community',
        submitter: sub.submitterHandle
          ? { handle: sub.submitterHandle, url: '' }
          : null,
        submittedAt: sub.submittedAt,
        confirms: subConfirms,
        needed: sub.confirmsNeeded,
        view: viewKind,
        counterPointer: counterPointerFor(sub.tier),
        lastAdminActionKind: lastAdminActionKindFor(sub.tier),
        note: sub.note,
        onConfirm: () => setActiveCorroborationId(sub.id),
        onWithdraw: () => {
          void (async () => {
            const token = await getToken()
            if (!token) return
            try {
              const res = await fetch(
                `${process.env['NEXT_PUBLIC_API_URL']}/v1/submissions/${sub.id}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                },
              )
              if (res.ok) {
                setLocalSubmissions((prev) =>
                  prev.filter((item) => item.id !== sub.id),
                )
              } else {
                console.error('Withdraw failed', res.status)
              }
            } catch (err) {
              console.error('Withdraw failed', err)
            }
          })()
        },
        onEdit: () => {
          setSubmitPriceEditMode(true)
          setSubmitPriceOpen(true)
        },
      }
      return { id: sub.id, props }
    })

    return (
      <>
        {visibleSubs.length === 2 ? (
          <TwoPendingStack cards={pendingCardProps.map((item) => item.props)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingCardProps.map(({ id, props }) => (
              <PendingCardB key={id} {...props} />
            ))}
          </div>
        )}

        {activeCorroboration !== null && (
          <CorroborationSheet
            submission={{
              floor: parseFloat(activeCorroboration.priceMin),
              ...(activeCorroboration.priceMax !== null
                ? { ceiling: parseFloat(activeCorroboration.priceMax) }
                : {}),
              tier: activeCorroboration.tier,
              vendor: activeCorroboration.vendor,
              kind:
                activeCorroboration.vendor === 'VenueBoxOffice'
                  ? 'boxoffice'
                  : 'community',
              submitter: activeCorroboration.submitterHandle
                ? { handle: activeCorroboration.submitterHandle, url: '' }
                : null,
              submittedAt: activeCorroboration.submittedAt,
              // Submitter counts as observation #1 (#831); also fold in the
              // optimistic localConfirms boost so reopening the sheet after a
              // successful corroboration shows the same count as the
              // PendingCardB it was opened from (#834 Copilot R1).
              confirms: displayConfirms(
                activeCorroboration.confirmsCount,
                localConfirms[activeCorroboration.id] ?? 0,
              ),
              needed: activeCorroboration.confirmsNeeded,
              note: activeCorroboration.note,
              submissionId: activeCorroboration.id,
            }}
            open={activeCorroborationId !== null}
            onClose={() => setActiveCorroborationId(null)}
            onConfirm={(method) => {
              const confirmedId = activeCorroboration.id
              setActiveCorroborationId(null)
              void (async () => {
                const token = await getToken()
                if (!token) return
                try {
                  const res = await fetch(
                    `${process.env['NEXT_PUBLIC_API_URL']}/v1/events/${event.id}/price-submissions/${confirmedId}/confirm`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ method }),
                    },
                  )
                  if (res.ok) {
                    setLocalConfirms((prev) => ({
                      ...prev,
                      [confirmedId]: (prev[confirmedId] ?? 0) + 1,
                    }))
                  }
                } catch (err) {
                  console.error(
                    'EventDetailPriceBlock: price confirm failed',
                    err,
                  )
                }
              })()
            }}
            onSubmitUpdate={() => {
              setActiveCorroborationId(null)
              setSubmitPriceOpen(true)
            }}
          />
        )}

        <SubmitPriceModal
          open={submitPriceOpen}
          onClose={() => {
            setSubmitPriceOpen(false)
            setSubmitPriceEditMode(false)
          }}
          openInEditMode={submitPriceEditMode}
          eventId={event.id}
          artist={event.artist}
          venueName={event.venue.name}
          date={event.date}
          onSuccess={applySubmissionResults}
          onWithdrawSuccess={(submissionId) => {
            setLocalSubmissions((prev) =>
              prev.filter((sub) => sub.id !== submissionId),
            )
          }}
        />
      </>
    )
  }

  // ── 4. Single pending submission (no corroborated price yet) ─────
  // Detected when priceMin is present but priceApprovalKind is null and
  // priceStatus is not 'live'. The submissionId is not yet surfaced in the
  // EventDetailResponse, so corroboration is read-only for now.
  if (
    priceMin !== null &&
    event.priceApprovalKind == null &&
    event.priceStatus !== 'live'
  ) {
    // API does not expose submitter userId or isSubmitter boolean;
    // isSelf cannot be determined client-side. Always show the 'other' view
    // until the API surfaces a dedicated field.
    return (
      <>
        <PendingCardB
          floor={priceMin}
          {...(priceMax !== null ? { ceiling: priceMax } : {})}
          tier="General Admission"
          vendor={event.priceVendor ?? event.venue.name}
          kind="community"
          submitter={
            event.priceSubmitterHandle
              ? { handle: event.priceSubmitterHandle, url: '' }
              : null
          }
          submittedAt={event.priceObservedAt ?? new Date().toISOString()}
          // Submitter counts as observation #1 (#831). API doesn't surface
          // confirmsCount on this legacy path, so the floor for a fresh
          // pending row is the submitter alone. `needed` is derived from
          // the policy + event date so imminent shows render the right
          // denominator (#835 Copilot R3).
          confirms={SUBMITTER_OBSERVATION}
          needed={corroborationConfirmsRequired(event.date)}
          view="other"
          onConfirm={() => setLegacyCorroborationOpen(true)}
          onWithdraw={() => {
            // Requires submissionId from API — future work
          }}
          onEdit={() => {
            // Requires submissionId from API — future work
          }}
        />
        {legacyCorroborationOpen && (
          <CorroborationSheet
            submission={{
              floor: priceMin,
              ...(priceMax !== null ? { ceiling: priceMax } : {}),
              tier: 'General Admission',
              vendor: event.priceVendor ?? event.venue.name,
              kind: 'community',
              submitter: event.priceSubmitterHandle
                ? { handle: event.priceSubmitterHandle, url: '' }
                : null,
              submittedAt: event.priceObservedAt ?? new Date().toISOString(),
              // Submitter counts as observation #1 (#831). Sheet stays in
              // sync with the card above — same policy-derived denominator
              // so legacy imminent shows match the rest of the price block
              // (#835 Copilot R3).
              confirms: SUBMITTER_OBSERVATION,
              needed: corroborationConfirmsRequired(event.date),
              // The submission ID is not yet surfaced in EventDetailResponse.
              // This is a placeholder until the API exposes it.
              submissionId: '',
            }}
            open={legacyCorroborationOpen}
            onClose={() => setLegacyCorroborationOpen(false)}
            onConfirm={(_method) => {
              // submissionId not yet in EventDetailResponse; confirm is a no-op
              // until the API exposes it. Sheet will close without confirming.
              setLegacyCorroborationOpen(false)
            }}
            onSubmitUpdate={() => setLegacyCorroborationOpen(false)}
          />
        )}
      </>
    )
  }

  // ── 5. Standard PriceDisplay ────────────────────────────────────
  // No Phase 8.5 override applies — render the existing price card.
  // When price is null (community-handoff card), own the submit modal so
  // onSuccess can update localSubmissions and transition into section 4a.
  const noPriceState = event.ticketPriceMin === null
  return (
    <>
      <PriceDisplay
        priceMin={event.ticketPriceMin}
        priceMax={event.ticketPriceMax}
        priceSource={event.priceSource}
        venueName={event.venue.name}
        ticketUrl={event.ticketUrl}
        eventId={event.id}
        artist={event.artist}
        date={event.date}
        priceStatus={event.priceStatus ?? null}
        ticketPriceOpenedAt={event.ticketPriceOpenedAt ?? null}
        ticketFees={event.ticketFees ?? null}
        priceVendor={event.priceVendor ?? null}
        priceSubmitterHandle={event.priceSubmitterHandle ?? null}
        priceObservedAt={event.priceObservedAt ?? null}
        priceApprovalKind={event.priceApprovalKind ?? null}
        priceApprovedAt={event.priceApprovedAt ?? null}
        priceAlternates={event.priceAlternates ?? null}
        {...(noPriceState
          ? { onSubmitPrice: () => setSubmitPriceOpen(true) }
          : {})}
      />
      {/* Fix 14: hide SubmitPriceCardCta for cancelled events */}
      {!noPriceState && event.status !== 'cancelled' && (
        <div className="mt-3">
          <SubmitPriceCardCta
            eventId={event.id}
            artist={event.artist}
            venueName={event.venue.name}
            date={event.date}
          />
        </div>
      )}
      {noPriceState && (
        <SubmitPriceModal
          open={submitPriceOpen}
          onClose={() => {
            setSubmitPriceOpen(false)
            setSubmitPriceEditMode(false)
          }}
          openInEditMode={submitPriceEditMode}
          eventId={event.id}
          artist={event.artist}
          venueName={event.venue.name}
          date={event.date}
          onSuccess={applySubmissionResults}
          onWithdrawSuccess={(submissionId) => {
            setLocalSubmissions((prev) =>
              prev.filter((sub) => sub.id !== submissionId),
            )
          }}
        />
      )}
    </>
  )
}

// ── EventDetailFooter ────────────────────────────────────────────────
// Renders the report footer link + sheet at the bottom of the event detail page.

export function EventDetailFooter({
  event,
  reports,
}: Omit<EventDetailSharedProps, 'currentUserId'>) {
  const router = useRouter()
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false)
  const [evidenceFormOpen, setEvidenceFormOpen] = useState(false)
  const [evidenceFormReportType, setEvidenceFormReportType] = useState<
    'sold-out' | 'cancelled' | 'postponed'
  >('cancelled')

  const pendingSoldOut = findPendingReport(reports, 'sold-out')
  const pendingCancelled = findPendingReport(reports, 'cancelled')
  const pendingPostponed = findPendingReport(reports, 'postponed')

  // Derive the footer live status:
  // 1. Promoted report → event.status or priceStatus
  // 2. Pending sold-out → 'sold-out'
  // 3. No active report → null
  const footerLiveStatus: 'sold-out' | 'cancelled' | 'postponed' | null =
    event.status === 'cancelled'
      ? 'cancelled'
      : event.status === 'postponed'
        ? 'postponed'
        : event.priceStatus === 'soldout' || pendingSoldOut !== null
          ? 'sold-out'
          : null

  // When there's a pending cancellation/postponement (not yet promoted), the footer
  // CTA becomes "Tickets still available?" and the ReportSheet must show the counter-
  // report options (liveStatus='cancelled' → only 'available' is shown).
  const hasPendingCancellation =
    pendingCancelled !== null && event.status !== 'cancelled'
  const hasPendingPostponement =
    pendingPostponed !== null && event.status !== 'postponed'
  const hasPendingSoldOut =
    pendingSoldOut !== null && event.priceStatus !== 'soldout'

  // The liveStatus passed to the ReportSheet controls which options are shown.
  // For pending-but-not-promoted states, pass the pending type so the counter-report
  // path (Tickets available) is the only visible option.
  const reportSheetLiveStatus: 'sold-out' | 'cancelled' | 'postponed' | null =
    hasPendingCancellation
      ? 'cancelled'
      : hasPendingPostponement
        ? 'postponed'
        : footerLiveStatus

  // The "CURRENTLY LIVE" chip in ReportSheet shows pending state when the report
  // is pending (not yet promoted by admin).
  const reportSheetIsPending =
    hasPendingCancellation || hasPendingPostponement || hasPendingSoldOut

  return (
    <>
      <ReportFooterLink
        liveStatus={footerLiveStatus}
        onOpen={() => setIsReportSheetOpen(true)}
      />
      <ReportSheet
        open={isReportSheetOpen}
        onClose={() => setIsReportSheetOpen(false)}
        liveStatus={reportSheetLiveStatus}
        isPending={reportSheetIsPending}
        eventDate={event.date}
        onSelect={(reportType) => {
          setIsReportSheetOpen(false)
          // 'available' is a counter-report — the API does not yet support this status.
          // The modal closes cleanly; backend support is a follow-up item.
          if (
            reportType === 'sold-out' ||
            reportType === 'cancelled' ||
            reportType === 'postponed'
          ) {
            setEvidenceFormReportType(reportType)
            setEvidenceFormOpen(true)
          }
        }}
      />
      <EvidenceForm
        open={evidenceFormOpen}
        onClose={() => setEvidenceFormOpen(false)}
        reportType={evidenceFormReportType}
        eventId={event.id}
        eventDate={event.date}
        onSuccess={() => {
          setEvidenceFormOpen(false)
          router.refresh()
        }}
      />
    </>
  )
}
