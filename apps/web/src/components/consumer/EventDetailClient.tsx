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
import type { EventReport, EventDetailResponse } from '@concert-crawl/types'
import { confirmEventReport, withdrawEventReport } from '@/lib/events'
import { PendingCardB } from '@/components/consumer/PendingCardB'
import { CorroborationSheet } from '@/components/consumer/CorroborationSheet'
import { MultiTierLiveCard } from '@/components/consumer/multi-tier/MultiTierLiveCard'
import { PendingReportBanner } from '@/components/consumer/reporting/PendingReportBanner'
import { PendingSoldOutCard } from '@/components/consumer/reporting/PendingSoldOutCard'
import { LiveReportBanner } from '@/components/consumer/reporting/LiveReportBanner'
import { ReportFooterLink } from '@/components/consumer/reporting/ReportFooterLink'
import { ReportSheet } from '@/components/consumer/reporting/ReportSheet'
import { EvidenceForm } from '@/components/consumer/reporting/EvidenceForm'
import { ConfirmReportSheet } from '@/components/consumer/reporting/ConfirmReportSheet'
import { PriceDisplay } from '@/components/consumer/PriceDisplay'
import { SubmitPriceCardCta } from '@/components/consumer/SubmitPriceCardCta'

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

  return (
    <>
      <div className="mb-3">
        {/* Live (promoted) report banner */}
        {liveReportStatus !== null && (
          <LiveReportBanner
            status={liveReportStatus}
            promotedAt={event.updatedAt}
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
            reporter={null}
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
          reporter={null}
          reportedAt={activePendingReport.createdAt}
          eventId={event.id}
          reportId={activePendingReport.id}
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
  const [corroborationOpen, setCorroborationOpen] = useState(false)

  const pendingSoldOutReport = findPendingReport(reports, 'sold-out')
  const pendingCancelledReport = findPendingReport(reports, 'cancelled')

  const priceMin = parseCents(event.ticketPriceMin)
  const priceMax = parseCents(event.ticketPriceMax)

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

  // ── 1. Pending sold-out report ──────────────────────────────────
  if (pendingSoldOutReport !== null) {
    const soldOutView = pendingSoldOutReport.isReporter ? 'reporter' : 'other'

    return (
      <PendingSoldOutCard
        floor={priceMin ?? 0}
        {...(priceMax !== null && priceMax !== undefined
          ? { ceiling: priceMax }
          : {})}
        vendor={event.priceVendor ?? event.venue.name}
        reporter={null}
        reportedAt={pendingSoldOutReport.createdAt}
        confirms={pendingSoldOutReport.confirmsCount + 1}
        needed={pendingSoldOutReport.confirmsNeeded}
        view={soldOutView}
        onConfirm={() => handleConfirmReport(pendingSoldOutReport.id)}
        onWithdraw={() => handleWithdrawReport(pendingSoldOutReport.id)}
        onEdit={() => {
          // Placeholder — edit sold-out report evidence
        }}
      />
    )
  }

  // ── 2. Pending cancelled report → hide price area ───────────────
  if (pendingCancelledReport !== null && event.status !== 'cancelled') {
    // The PriceDisplay is suppressed server-side too (event.status check in page.tsx).
    // Return null here as a belt-and-suspenders measure.
    return null
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
        <MultiTierLiveCard headline={headline} alternates={alternateRows} />
        <div className="mt-3">
          <SubmitPriceCardCta
            eventId={event.id}
            artist={event.artist}
            venueName={event.venue.name}
            date={event.date}
          />
        </div>
      </>
    )
  }

  // ── 4a. Pending submission from API — no corroborated price yet ──
  if (event.pendingSubmission != null) {
    const sub = event.pendingSubmission
    const displayConfirms = sub.confirmsCount + 1
    const isBoxOffice = sub.vendor === 'VenueBoxOffice'
    const viewKind: 'other' | 'submitter' | 'self-locked' = sub.isSubmitter
      ? 'submitter'
      : 'other'

    return (
      <>
        <PendingCardB
          floor={parseFloat(sub.priceMin)}
          {...(sub.priceMax !== null ? { ceiling: parseFloat(sub.priceMax) } : {})}
          tier={sub.tier}
          vendor={sub.vendor}
          kind={isBoxOffice ? 'boxoffice' : 'community'}
          submitter={
            sub.submitterHandle
              ? { handle: sub.submitterHandle, url: '' }
              : null
          }
          submittedAt={sub.submittedAt}
          confirms={displayConfirms}
          needed={sub.confirmsNeeded}
          view={viewKind}
          note={sub.note}
          onConfirm={() => setCorroborationOpen(true)}
          onWithdraw={() => {
            /* requires withdraw flow — future */
          }}
          onEdit={() => {
            /* requires edit flow — future */
          }}
        />
        {corroborationOpen && (
          <CorroborationSheet
            submission={{
              floor: parseFloat(sub.priceMin),
              ...(sub.priceMax !== null
                ? { ceiling: parseFloat(sub.priceMax) }
                : {}),
              tier: sub.tier,
              vendor: sub.vendor,
              kind: isBoxOffice ? 'boxoffice' : 'community',
              submitter: sub.submitterHandle
                ? { handle: sub.submitterHandle, url: '' }
                : null,
              submittedAt: sub.submittedAt,
              confirms: displayConfirms,
              needed: sub.confirmsNeeded,
              submissionId: sub.id,
            }}
            open={corroborationOpen}
            onClose={() => setCorroborationOpen(false)}
            onConfirm={(_method) => {
              setCorroborationOpen(false)
              router.refresh()
            }}
            onSubmitUpdate={() => setCorroborationOpen(false)}
          />
        )}
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
          confirms={0}
          needed={2}
          view="other"
          onConfirm={() => setCorroborationOpen(true)}
          onWithdraw={() => {
            // Requires submissionId from API — future work
          }}
          onEdit={() => {
            // Requires submissionId from API — future work
          }}
        />
        {corroborationOpen && (
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
              confirms: 0,
              needed: 2,
              // The submission ID is not yet surfaced in EventDetailResponse.
              // This is a placeholder until the API exposes it.
              submissionId: '',
            }}
            open={corroborationOpen}
            onClose={() => setCorroborationOpen(false)}
            onConfirm={(_method) => {
              // submissionId not yet in EventDetailResponse; confirm is a no-op
              // until the API exposes it. Sheet will close without confirming.
              setCorroborationOpen(false)
            }}
            onSubmitUpdate={() => setCorroborationOpen(false)}
          />
        )}
      </>
    )
  }

  // ── 5. Standard PriceDisplay ────────────────────────────────────
  // No Phase 8.5 override applies — render the existing price card.
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
      />
      {event.ticketPriceMin !== null && (
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

// ── EventDetailFooter ────────────────────────────────────────────────
// Renders the report footer link + sheet at the bottom of the event detail page.

export function EventDetailFooter({
  event,
  reports,
}: Omit<EventDetailSharedProps, 'currentUserId'>) {
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false)

  const pendingSoldOut = findPendingReport(reports, 'sold-out')

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

  return (
    <>
      <ReportFooterLink
        liveStatus={footerLiveStatus}
        onOpen={() => setIsReportSheetOpen(true)}
      />
      <ReportSheet
        open={isReportSheetOpen}
        onClose={() => setIsReportSheetOpen(false)}
        liveStatus={footerLiveStatus}
        eventDate={event.date}
        onSelect={() => {
          setIsReportSheetOpen(false)
          // Full report flow (EvidenceForm, etc.) is wired in a follow-up
        }}
      />
    </>
  )
}
