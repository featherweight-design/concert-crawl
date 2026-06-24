'use client'

import { useEffect, useRef, useState, type FC } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminEntry } from './AdminEntry'
import {
  useDeferContest,
  useResolveContest,
  useReviewContestDetail,
  type ContestDetailData,
} from '@/lib/queries/admin-contests'
import { ApiError } from '@/lib/api'
import { REVIEW_CONTEST_COPY } from './definitions/copy'

// AdminDisputePanel — 760px two-up adjudication surface mounted at
// /admin/review/contests/:contestId. Pulls the contest detail from React
// Query (so refetches stay in sync with the queue), renders two
// AdminEntry cards side-by-side, and surfaces three commit-on-click
// actions: Need more info (defer), Keep original (resolve parent_wins),
// Promote counter (resolve challenger_wins).
//
// Visual contract pinned to design property table §3
// (docs/superpowers/design-tables/admin-contest-review.md lines 97–191).
// Source citations in comments point back to dispute-surfaces.jsx rows
// the table cites.
//
// Read-only state: when `counter.status !== 'pending'` OR
// `parent.status === 'archived'` the panel still renders both AdminEntry
// cards (so the admin can audit the history) but hides the reason field
// + buttons and surfaces a banner with a link back to the live event.
// `winner` derives from the counter status: corroborated → counter won,
// otherwise (archived / stale) → parent won.
//
// Deferred (counter.status='pending' AND lastAdminActionKind='defer'):
// stays actionable — admin can still resolve or re-defer. A chip near
// the header surfaces the engagement signal.

// ───── Constants ─────────────────────────────────────────────────────────────

// Spec §4.7 — admin reason length bounds. Server enforces via Zod; the
// client mirrors them so the buttons stay disabled until the minimum is
// reached and the textarea caps typing at the maximum.
const REASON_MIN = 10
const REASON_MAX = 2000

// Palette constants — same source pixels as AdminEntry / PriceDisputesQueue
// (dispute-surfaces.jsx:21–22 GOLD_D + AZ_D). Kept as literals so the
// button accents match the design source 1-for-1.
const AZURE_DARK = 'oklch(0.62 0.12 240)'
const GOLD_DARK = 'oklch(0.66 0.14 78)'
const INTER = 'Inter, system-ui, sans-serif'
const MONO = "'JetBrains Mono', monospace"

// Where the panel sends the admin after a successful action. Spec §7.8 +
// the user's brief both pin this as the queue tab.
const QUEUE_ROUTE = '/admin/review?tab=contests'

// ───── Props ─────────────────────────────────────────────────────────────────

export interface AdminDisputePanelProps {
  // contestId is the parent submission id (the canonical contest key
  // returned by the queue endpoint). The panel calls the detail hook
  // with it and renders off the result.
  contestId: string
}

// ───── Type guards / helpers ─────────────────────────────────────────────────

// True when the contest is already resolved (or the parent was archived
// for any other reason — stale rollups, source flip). Read-only mode
// hinges on this predicate; we keep it pure so tests can re-use it if
// the gap report ever calls for unit coverage of the rule.
const isReadOnly = (contest: ContestDetailData): boolean =>
  contest.parent.status === 'archived' || contest.counter.status !== 'pending'

// Derives the winner badge target from a read-only contest's row
// statuses. Counter corroborated ⇒ counter won; otherwise the parent
// kept the slot. `null` is impossible in read-only mode but the type
// system can't see that so we keep the discriminator explicit.
const readOnlyWinner = (
  contest: ContestDetailData,
): 'original' | 'counter' | null => {
  if (contest.counter.status === 'corroborated') return 'counter'
  return 'original'
}

// True when the contest was deferred by an admin previously. Engagement
// signal only — doesn't block action.
const wasDeferred = (contest: ContestDetailData): boolean =>
  contest.counter.status === 'pending' &&
  contest.counter.lastAdminActionKind === 'defer'

// Extracts a usable banner message from a mutation rejection. Prefer
// ApiError.message when present (carries the server's specific reason
// — tier mismatch, precondition_failed, etc.) so admins see the exact
// failure mode instead of a generic copy line. Falls back to the
// generic copy when the rejection has no readable message.
const mutationErrorMessage = (err: unknown): string => {
  if (err instanceof ApiError && err.message.length > 0) return err.message
  if (err instanceof Error && err.message.length > 0) return err.message
  return REVIEW_CONTEST_COPY.panel.mutationError
}

// Returns the side whose `status === 'archived'` so the banner can
// surface that side's `archivedReason` (the admin's resolution
// rationale). Null when neither side is archived (corroborated /
// resolved-without-archive states).
const archivedSide = (
  contest: ContestDetailData,
): 'parent' | 'counter' | null => {
  if (contest.counter.status === 'archived') return 'counter'
  if (contest.parent.status === 'archived') return 'parent'
  return null
}

// ───── Component ─────────────────────────────────────────────────────────────

export const AdminDisputePanel: FC<AdminDisputePanelProps> = ({
  contestId,
}) => {
  const router = useRouter()
  const detail = useReviewContestDetail(contestId)
  const resolve = useResolveContest()
  const defer = useDeferContest()
  const [reason, setReason] = useState('')
  // Stores the latest mutation error message so the inline banner can
  // surface the server's specific reason (e.g. "Parent tier GA does not
  // match challenger tier VIP" on a 409 precondition_failed) instead of
  // a static generic copy line. Null when no error is pending; a string
  // when the most recent mutation rejected. Falls back to a generic
  // copy line when the error has no usable message.
  const [mutationError, setMutationError] = useState<string | null>(null)
  // Optimistic winner preview — set on click before the API commits so
  // the AdminEntry winner border flashes the admin's choice while the
  // mutation is in flight. Cleared on error so the optimistic accent
  // doesn't linger when the action fails.
  const [optimisticWinner, setOptimisticWinner] = useState<
    'original' | 'counter' | null
  >(null)
  const firstButtonRef = useRef<HTMLButtonElement | null>(null)

  // ESC navigates back to the queue. Plan §15 line 3690 — admin's
  // primary escape hatch. Window listener keeps the binding active even
  // when the textarea has focus (a contained handler would let the
  // textarea swallow the key first).
  useEffect(() => {
    const handler = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') router.push(QUEUE_ROUTE)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router])

  // Focus the first action button on mount when the panel is actionable.
  // Plan §15 line 3691 — admin lands on the "Need more info" button so
  // keyboard nav into the action row is immediate. Skipped on read-only
  // because the button doesn't exist there.
  useEffect(() => {
    if (detail.data && !isReadOnly(detail.data)) {
      firstButtonRef.current?.focus()
    }
  }, [detail.data])

  // ───── Loading state ───────────────────────────────────────────────
  if (detail.isPending) {
    return (
      <div
        role="status"
        style={{
          padding: 24,
          color: 'var(--fg-muted)',
          fontSize: 13,
          fontFamily: INTER,
        }}
      >
        {REVIEW_CONTEST_COPY.panel.loading}
      </div>
    )
  }

  // ───── Error state ─────────────────────────────────────────────────
  if (detail.isError || !detail.data) {
    // Differentiate 404 (contest never existed / was hard-deleted) from
    // generic errors. 404s render the contest-specific notFound copy
    // without a retry affordance (retrying a 404 never succeeds);
    // anything else gets the generic banner + retry button.
    const isNotFound =
      detail.error instanceof ApiError && detail.error.status === 404
    if (isNotFound) {
      return (
        <div
          role="alert"
          style={{
            padding: '14px 16px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
            color: 'var(--fg-muted)',
            fontFamily: INTER,
            fontSize: 13,
          }}
        >
          {REVIEW_CONTEST_COPY.panel.notFound}
        </div>
      )
    }
    return (
      <div
        role="alert"
        style={{
          padding: '14px 16px',
          borderRadius: 10,
          border:
            '1px solid color-mix(in oklab, var(--danger) 30%, transparent)',
          background: 'color-mix(in oklab, var(--danger) 8%, transparent)',
          color: 'var(--danger)',
          fontFamily: INTER,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span>{REVIEW_CONTEST_COPY.panel.errorHeading}</span>
        <button
          type="button"
          onClick={() => void detail.refetch()}
          style={{
            background: 'transparent',
            border: '1px solid currentColor',
            color: 'inherit',
            padding: '6px 12px',
            borderRadius: 8,
            fontFamily: INTER,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {REVIEW_CONTEST_COPY.panel.errorRetry}
        </button>
      </div>
    )
  }

  // ───── Data path ───────────────────────────────────────────────────
  const contest = detail.data
  const readOnly = isReadOnly(contest)
  const deferred = wasDeferred(contest)
  const winner: 'original' | 'counter' | null = readOnly
    ? readOnlyWinner(contest)
    : optimisticWinner

  // Action handlers — each is a single commit-on-click (spec §7.2 ruled
  // out the second-step confirm). Optimistic winner flashes the chosen
  // side; on error we clear it and surface the inline banner. Success
  // navigates back to the queue so the panel unmounts before the cache
  // invalidation refetches it.
  const reasonValid = reason.trim().length >= REASON_MIN
  const inFlight = resolve.isPending || defer.isPending
  const disabled = !reasonValid || inFlight

  // Trim the reason before sending so persisted rationale matches the
  // validation semantics (the disabled-state check uses `reason.trim()`).
  // Without this, an admin who types valid content with trailing
  // whitespace would persist that whitespace into the audit log even
  // though the UI treats it as semantically invisible.
  const onKeep = async () => {
    setOptimisticWinner('original')
    setMutationError(null)
    try {
      await resolve.mutateAsync({
        contestId: contest.contestId,
        resolution: 'parent_wins',
        reason: reason.trim(),
      })
      router.push(QUEUE_ROUTE)
    } catch (err) {
      setOptimisticWinner(null)
      setMutationError(mutationErrorMessage(err))
    }
  }

  const onPromote = async () => {
    setOptimisticWinner('counter')
    setMutationError(null)
    try {
      await resolve.mutateAsync({
        contestId: contest.contestId,
        resolution: 'challenger_wins',
        reason: reason.trim(),
      })
      router.push(QUEUE_ROUTE)
    } catch (err) {
      setOptimisticWinner(null)
      setMutationError(mutationErrorMessage(err))
    }
  }

  const onDefer = async () => {
    setMutationError(null)
    try {
      await defer.mutateAsync({
        contestId: contest.contestId,
        reason: reason.trim(),
      })
      router.push(QUEUE_ROUTE)
    } catch (err) {
      setMutationError(mutationErrorMessage(err))
    }
  }

  const title = [contest.eventTitle, contest.venueName, contest.eventDate].join(
    REVIEW_CONTEST_COPY.panel.titleSeparator,
  )

  return (
    <article
      // §3 lines 101–107 — panel container. 760 width, 24 padding,
      // 14 borderRadius, 1px border, Inter font stack.
      style={{
        width: 760,
        maxWidth: '100%',
        padding: 24,
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: INTER,
        borderRadius: 14,
        border: '1px solid var(--border)',
      }}
    >
      {/* Header — eyebrow + title on the left, status pill + deferred
          chip on the right. §3 lines 109–120 + dispute-surfaces.jsx:
          753–776 (single horizontal flex row with space-between). The
          16px bottom margin is constant regardless of read-only vs
          active state to keep the header rhythm consistent across the
          two surfaces. */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 9.5,
              color: 'var(--fg-subtle)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {REVIEW_CONTEST_COPY.panel.eyebrow}
          </div>
          <h2
            // Title — design source margin is top-only (`4px 0 0`) so
            // the spacing rhythm collapses between the title and the
            // header's bottom edge; the header's marginBottom owns the
            // gap to the next block.
            style={{
              fontFamily: INTER,
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: '-0.025em',
              color: 'var(--fg)',
              margin: '4px 0 0',
            }}
          >
            {title}
          </h2>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              background:
                'color-mix(in oklab, var(--warning) 16%, transparent)',
              color: 'var(--warning)',
              padding: '5px 10px',
              borderRadius: 999,
              fontFamily: MONO,
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {readOnly
              ? REVIEW_CONTEST_COPY.panel.statusPill.resolved
              : REVIEW_CONTEST_COPY.panel.statusPill.open}
          </span>
          {deferred ? (
            <span
              // Deferred chip — engagement signal sits to the right of
              // the status pill. Same mono-uppercase shape as the
              // existing pill so the header reads as one row of metadata
              // rather than competing badges.
              style={{
                display: 'inline-block',
                background: 'color-mix(in oklab, var(--fg) 6%, transparent)',
                color: 'var(--fg-muted)',
                padding: '5px 10px',
                borderRadius: 999,
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {REVIEW_CONTEST_COPY.panel.deferredChip}
            </span>
          ) : null}
        </div>
      </header>

      {/* Guidance block OR read-only banner. Mutually exclusive. §3
          lines 121–127 (guidance), plan §15 line 3689 (banner). The
          header's 16px marginBottom owns the gap above; no marginTop
          here so the spacing rhythm stays consistent across the two
          surfaces. */}
      {readOnly ? (
        <div
          role="status"
          style={{
            padding: '12px 14px',
            background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            color: 'var(--fg-muted)',
            fontFamily: INTER,
            fontSize: 13,
            lineHeight: 1.5,
            letterSpacing: '-0.005em',
          }}
        >
          {REVIEW_CONTEST_COPY.panel.staleBanner.lead}{' '}
          <Link
            href={`/events/${contest.eventId}`}
            style={{ color: 'var(--fg)', textDecoration: 'underline' }}
          >
            {REVIEW_CONTEST_COPY.panel.staleBanner.link}
          </Link>
          {(() => {
            // Surface the archived side's resolution rationale so an
            // admin re-visiting a resolved contest sees WHY the loser
            // was archived (spec §4 line 245 — "reason shown to both
            // submitters"). The reason is captured on the archived row
            // at resolution time and round-trips through the detail
            // endpoint.
            const side = archivedSide(contest)
            const reasonText =
              side === 'parent'
                ? contest.parent.archivedReason
                : side === 'counter'
                  ? contest.counter.archivedReason
                  : null
            if (!reasonText) return null
            return (
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 9.5,
                    color: 'var(--fg-subtle)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 4,
                  }}
                >
                  {REVIEW_CONTEST_COPY.panel.archivedReason}
                </div>
                <blockquote
                  style={{
                    margin: 0,
                    color: 'var(--fg)',
                    fontFamily: INTER,
                    fontSize: 13,
                    lineHeight: 1.5,
                    letterSpacing: '-0.005em',
                    fontStyle: 'italic',
                  }}
                >
                  {`“${reasonText}”`}
                </blockquote>
              </div>
            )
          })()}
        </div>
      ) : (
        <p
          style={{
            padding: '10px 14px',
            margin: 0,
            background: 'color-mix(in oklab, var(--fg) 4%, transparent)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            fontFamily: INTER,
            fontSize: 13,
            lineHeight: 1.5,
            letterSpacing: '-0.005em',
            color: 'var(--fg-muted)',
          }}
        >
          {REVIEW_CONTEST_COPY.panel.guidance}
        </p>
      )}

      {/* Two-up grid — §3 lines 128–156. 1fr 16px 1fr columns; AdminEntry
          renders inside each side with the winner flag wired off the
          optimistic state (or the resolved status in read-only mode). */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 16px 1fr',
          alignItems: 'start',
          marginTop: 18,
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 9.5,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 8,
              color: 'var(--fg-subtle)',
            }}
          >
            {REVIEW_CONTEST_COPY.panel.columnEyebrows.original}
          </div>
          <AdminEntry
            side="original"
            priceMin={contest.parent.priceMin}
            priceMax={contest.parent.priceMax}
            tier={contest.tier}
            vendor={contest.parent.vendor}
            sourceCategory={contest.sourceCategory}
            submitter={{ handle: contest.parent.submitter.handle }}
            observedAt={contest.parent.observedAt}
            confirms={contest.parent.confirms}
            note={contest.parent.note}
            winner={winner}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            alignSelf: 'stretch',
            color: 'var(--fg-subtle)',
            fontFamily: MONO,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {REVIEW_CONTEST_COPY.panel.versusDivider}
        </div>
        <div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 9.5,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 8,
              color: 'var(--fg-subtle)',
            }}
          >
            {REVIEW_CONTEST_COPY.panel.columnEyebrows.counterPrefix}
            {contest.counter.status}
          </div>
          <AdminEntry
            side="counter"
            priceMin={contest.counter.priceMin}
            priceMax={contest.counter.priceMax}
            tier={contest.tier}
            vendor={contest.counter.vendor}
            sourceCategory={contest.sourceCategory}
            submitter={{ handle: contest.counter.submitter.handle }}
            observedAt={contest.counter.observedAt}
            confirms={contest.counter.confirms}
            note={contest.counter.note}
            winner={winner}
          />
        </div>
      </div>

      {/* Action area — only renders on actionable contests. Reason
          field + char count + three buttons in row order
          [needMoreInfo, keepOriginal, promoteCounter]. */}
      {readOnly ? null : (
        <>
          <label>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 9.5,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--fg-subtle)',
                marginBottom: 8,
              }}
            >
              {REVIEW_CONTEST_COPY.panel.reason.label}
            </div>
            <textarea
              value={reason}
              onChange={(evt) => setReason(evt.target.value)}
              maxLength={REASON_MAX}
              minLength={REASON_MIN}
              // No explicit aria-label — the wrapping <label> supplies the
              // accessible name via implicit association, preserving the
              // full visible disclosure ("Reason (shown to both
              // submitters)") for screen reader users. An aria-label would
              // override the wrapping label and hide the disclosure (R13).
              style={{
                width: '100%',
                background: 'var(--surface-1)',
                border: '1px solid var(--border-strong)',
                borderRadius: 10,
                padding: '10px 12px',
                fontFamily: INTER,
                fontSize: 13,
                letterSpacing: '-0.005em',
                color: 'var(--fg)',
                minHeight: 44,
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </label>

          <div
            // Char count + (when too short) inline helper. Right-aligned
            // below the textarea so it sits opposite the label eyebrow.
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 6,
              fontFamily: MONO,
              fontSize: 11,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.04em',
            }}
          >
            <span style={{ color: 'var(--fg-subtle)' }}>
              {reason.length > 0 && !reasonValid
                ? REVIEW_CONTEST_COPY.panel.reason.tooShort
                : ' '}
            </span>
            <span>
              {REVIEW_CONTEST_COPY.panel.reason.charCount(
                reason.length,
                REASON_MAX,
              )}
            </span>
          </div>

          {mutationError !== null ? (
            <div
              role="alert"
              // Inline mutation error — sits between the reason field
              // and the action row so admins reading the buttons see
              // the server's specific failure reason in their reading
              // path. Prefers the API's message (e.g. tier mismatch on
              // a 409 precondition_failed) over the generic copy.
              style={{
                marginTop: 12,
                padding: '10px 12px',
                borderRadius: 8,
                border:
                  '1px solid color-mix(in oklab, var(--danger) 30%, transparent)',
                background:
                  'color-mix(in oklab, var(--danger) 8%, transparent)',
                color: 'var(--danger)',
                fontFamily: INTER,
                fontSize: 12.5,
              }}
            >
              {mutationError}
            </div>
          ) : null}

          <div
            // §3 line 167 — flex row, gap 10, justifyContent flex-end.
            style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
              marginTop: 14,
            }}
          >
            <button
              ref={firstButtonRef}
              type="button"
              disabled={disabled}
              onClick={onDefer}
              // §3 lines 168–174 — transparent background, 1px
              // border-strong, fg-muted text.
              style={{
                background: 'transparent',
                border: '1px solid var(--border-strong)',
                color: 'var(--fg-muted)',
                padding: '10px 16px',
                borderRadius: 9,
                fontFamily: INTER,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '-0.005em',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              {REVIEW_CONTEST_COPY.panel.actions.needMoreInfo}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onKeep}
              // §3 lines 175–179 — gold accent border + text on a
              // transparent background.
              style={{
                background: 'transparent',
                border: `1px solid ${GOLD_DARK}`,
                color: GOLD_DARK,
                padding: '10px 16px',
                borderRadius: 9,
                fontFamily: INTER,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '-0.005em',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              {REVIEW_CONTEST_COPY.panel.actions.keepOriginal}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onPromote}
              // §3 lines 180–185 — azure-filled primary action.
              style={{
                background: AZURE_DARK,
                color: 'var(--fg-on-accent)',
                border: 'none',
                padding: '10px 16px',
                borderRadius: 9,
                fontFamily: INTER,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '-0.005em',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              {REVIEW_CONTEST_COPY.panel.actions.promoteCounter}
            </button>
          </div>
        </>
      )}
    </article>
  )
}
