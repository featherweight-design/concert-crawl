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
import { SP_POLICY } from '@concert-crawl/types'
import { confirmEventReport, withdrawEventReport } from '@/lib/events'
import { PendingCardB } from '@/components/consumer/PendingCardB'
import { CorroborationSheet } from '@/components/consumer/CorroborationSheet'
import { MixedTierCard } from '@/components/consumer/multi-tier/MixedTierCard'
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
import { SubmitPriceCardCta } from '@/components/consumer/SubmitPriceCardCta'
import { SubmitPriceModal } from '@/components/consumer/submit-price/SubmitPriceModal'

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

  // ── Fix 15: postponed confirmed → hide price section ───────────
  if (isPostponedConfirmed) {
    return null
  }

  // ── 0. Promoted sold-out (confirmed by community) ──────────────
  if (event.priceStatus === 'soldout' && event.soldOutReport != null) {
    const soldOut = event.soldOutReport
    const timeAgo = (() => {
      const diffMs = Date.now() - new Date(soldOut.reportedAt).getTime()
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      return `${Math.floor(diffHours / 24)}d ago`
    })()
    const AMBER = 'oklch(0.73 0.13 78)'
    return (
      <div
        style={{
          borderRadius: 12,
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '14px 14px 0' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Tickets
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              marginTop: 6,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontWeight: 800,
                fontSize: 28,
                color: 'var(--fg-subtle)',
                textDecoration: 'line-through',
                letterSpacing: '-0.025em',
                lineHeight: 1.05,
              }}
            >
              {priceMax != null
                ? `$${priceMin}–$${priceMax}`
                : priceMin != null
                  ? `$${priceMin}`
                  : '—'}
            </span>
            {/* Fix 13: bottom-aligned chip via alignSelf flex-end */}
            <span
              style={{
                background: AMBER,
                borderRadius: 6,
                padding: '3px 9px',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--fg-on-accent)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                alignSelf: 'flex-end',
              }}
            >
              Sold out
            </span>
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--fg-muted)',
              letterSpacing: '0.04em',
            }}
          >
            {soldOut.reporterHandle
              ? `Reported sold out by @${soldOut.reporterHandle} · ${soldOut.confirmsCount} fan${soldOut.confirmsCount !== 1 ? 's' : ''} confirmed`
              : `Reported sold out · ${soldOut.confirmsCount} fan${soldOut.confirmsCount !== 1 ? 's' : ''} confirmed`}
          </div>
        </div>
        <div
          style={{
            margin: '12px 14px 0',
            borderTop: '1px solid var(--border)',
            padding: '10px 0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: AMBER,
              flexShrink: 0,
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: `color-mix(in oklab, ${AMBER} 80%, var(--fg-subtle))`,
              letterSpacing: '0.04em',
            }}
          >
            {`as of ${timeAgo} — could be stale`}
            {soldOut.reporterHandle && ` · @${soldOut.reporterHandle}`}
          </span>
        </div>
      </div>
    )
  }

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
          confirms={pendingSoldOutReport.confirmsCount + 1}
          needed={pendingSoldOutReport.confirmsNeeded}
          view={soldOutView}
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
        eventId={event.id}
        disputedSubmissionId={counter.id}
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

  // ── 4a. Pending submissions from API — no corroborated price yet ─
  if (event.pendingSubmissions != null && event.pendingSubmissions.length > 0) {
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

    // If any submission has already met the confirm threshold (displayConfirms >= needed),
    // treat it as effectively corroborated and render via PriceDisplay + submit CTA.
    // localConfirms tracks confirms added in this session without a page refresh.
    const confirmedSub = visibleSubs.find(
      (sub) =>
        sub.confirmsCount + 1 + (localConfirms[sub.id] ?? 0) >=
        sub.confirmsNeeded,
    )
    if (confirmedSub != null) {
      const approvalKind =
        confirmedSub.vendor === 'VenueBoxOffice' ? 'admin' : 'fan'
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
            priceApprovalKind={approvalKind}
            priceApprovedAt={confirmedSub.submittedAt}
            priceAlternates={null}
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

    const pendingCardProps = visibleSubs.map((sub) => {
      const displayConfirms =
        sub.confirmsCount + 1 + (localConfirms[sub.id] ?? 0)
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
        confirms: displayConfirms,
        needed: sub.confirmsNeeded,
        view: viewKind,
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
              confirms: activeCorroboration.confirmsCount + 1,
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
          onSuccess={(result) => {
            if (result.isEdit) {
              setLocalSubmissions((prev) =>
                prev.map((sub) =>
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
                ),
              )
            } else {
              const diffDays = Math.floor(
                (new Date(event.date).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              )
              const isImminent =
                diffDays >= 0 && diffDays <= SP_POLICY.imminentThresholdDays
              setLocalSubmissions((prev) => [
                ...prev,
                {
                  id: result.id,
                  priceMin: result.priceMin,
                  priceMax: result.priceMax,
                  tier: result.tier,
                  vendor: result.vendor,
                  howFound: result.howFound,
                  note: null,
                  submitterHandle: null,
                  submittedAt: new Date().toISOString(),
                  confirmsCount: 0,
                  confirmsNeeded: isImminent
                    ? SP_POLICY.confirmsRequiredImminent
                    : SP_POLICY.confirmsRequired,
                  isSubmitter: true,
                },
              ])
            }
          }}
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
          confirms={0}
          needed={2}
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
              confirms: 0,
              needed: 2,
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
      {/* Fix 14: hide SubmitPriceCardCta for cancelled events */}
      {event.ticketPriceMin !== null && event.status !== 'cancelled' && (
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
