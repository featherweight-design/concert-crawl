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
const REASON_MAX = 280

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

// ───── Component ─────────────────────────────────────────────────────────────

export const AdminDisputePanel: FC<AdminDisputePanelProps> = ({
  contestId,
}) => {
  const router = useRouter()
  const detail = useReviewContestDetail(contestId)
  const resolve = useResolveContest()
  const defer = useDeferContest()
  const [reason, setReason] = useState('')
  const [mutationErrored, setMutationErrored] = useState(false)
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
          onClick={() => detail.refetch()}
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

  const onKeep = async () => {
    setOptimisticWinner('original')
    setMutationErrored(false)
    try {
      await resolve.mutateAsync({
        contestId: contest.contestId,
        resolution: 'parent_wins',
        reason,
      })
      router.push(QUEUE_ROUTE)
    } catch {
      setOptimisticWinner(null)
      setMutationErrored(true)
    }
  }

  const onPromote = async () => {
    setOptimisticWinner('counter')
    setMutationErrored(false)
    try {
      await resolve.mutateAsync({
        contestId: contest.contestId,
        resolution: 'challenger_wins',
        reason,
      })
      router.push(QUEUE_ROUTE)
    } catch {
      setOptimisticWinner(null)
      setMutationErrored(true)
    }
  }

  const onDefer = async () => {
    setMutationErrored(false)
    try {
      await defer.mutateAsync({ contestId: contest.contestId, reason })
      router.push(QUEUE_ROUTE)
    } catch {
      setMutationErrored(true)
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
      {/* Header — eyebrow + title + status pill (+ deferred chip). §3
          lines 109–120. */}
      <header>
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
          style={{
            fontFamily: INTER,
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: '-0.025em',
            color: 'var(--fg)',
            margin: '4px 0',
          }}
        >
          {title}
        </h2>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
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
          lines 121–127 (guidance), plan §15 line 3689 (banner). */}
      {readOnly ? (
        <div
          role="status"
          style={{
            marginTop: 18,
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
        </div>
      ) : (
        <p
          style={{
            marginTop: 12,
            padding: '10px 14px',
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
          {mutationErrored ? (
            <div
              role="alert"
              style={{
                marginBottom: 12,
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
              {REVIEW_CONTEST_COPY.panel.mutationError}
            </div>
          ) : null}

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
              aria-label={REVIEW_CONTEST_COPY.panel.reason.ariaLabel}
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
