'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ProgressDots } from './ProgressDots'
import { CCClusterMark } from '@/components/brand/cc-cluster-mark/CCClusterMark'
import { CCWordmark } from '@/components/brand/cc-wordmark/CCWordmark'
import { FounderNote } from './steps/FounderNote'
import { HowItWorks } from './steps/HowItWorks'
import { WhatItDoesToday } from './steps/WhatItDoesToday'
import { WhatItDoesntYet } from './steps/WhatItDoesntYet'
import { MakeItYours } from './steps/MakeItYours'
import { PickGenres } from './steps/PickGenres'
import { PickArtists } from './steps/PickArtists'
import { YoureIn } from './steps/YoureIn'
import { ONBOARDING_COPY } from './definitions/copy'
import { SkipRail, type SkipMode } from './SkipRail'
import { useOnboardingSuggestions } from './lib/use-pick-suggestions'
import { useArtistPicksCommit } from './lib/use-artist-picks-commit'
import { usePlanState } from '@/lib/queries/use-plan-state'
import { useEntitlement } from '@/lib/queries/use-entitlement'
import { TierPickerSheet } from '@/components/consumer/tier-picker/lazy'
import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants'
import {
  ARTIST_PICKS_KEY,
  GENRE_PICKS_KEY,
  PICK_COLUMNS_DESKTOP,
  PICK_COLUMNS_MOBILE,
  readPicks,
  writePicks,
  type PickArtist,
} from '@/components/consumer/artist-picker'
import {
  appendPendingTier,
  buildReturnUrl,
  DEFAULT_RETURN_PATH,
  sanitizeReturnPath,
} from '@/lib/auth/intent'

const nav = ONBOARDING_COPY.nav
const pickCopy = ONBOARDING_COPY.pickArtists

// `theme` sits before `notyet` so the tour ends on what the product *will* do
// rather than on its gaps. `genres` and `artists` slot in after that pair and
// before `done`: the pitch has to land before we ask anyone to act on it, and
// the last step still gets to be the send-off.
//
// The counter and the dots read `FLOW.length`, so adding steps here is the
// whole change — nothing downstream hardcodes a total.
const FLOW = [
  'welcome',
  'how',
  'today',
  'theme',
  'notyet',
  'genres',
  'artists',
  'done',
] as const
type StepKey = (typeof FLOW)[number]

const DESKTOP_CARD_WIDTH = 620
// The artists step needs a wider card for its 5-column grid (OB-12).
const DESKTOP_PICKER_CARD_WIDTH = 760

interface StepContentProps {
  stepKey: StepKey
  /** 2 in the mobile tree, 5 in the desktop one — both are mounted at once. */
  columns: number
  genres: string[]
  pickedGenres: ReadonlySet<string>
  onToggleGenre: (genre: string) => void
  suggestions: PickArtist[]
  suggestionsLoading: boolean
  pickedArtists: ReadonlySet<string>
  onToggleArtist: (slug: string) => void
}

function StepContent({
  stepKey,
  columns,
  genres,
  pickedGenres,
  onToggleGenre,
  suggestions,
  suggestionsLoading,
  pickedArtists,
  onToggleArtist,
}: StepContentProps) {
  if (stepKey === 'welcome') return <FounderNote />
  if (stepKey === 'how') return <HowItWorks />
  if (stepKey === 'today') return <WhatItDoesToday />
  if (stepKey === 'notyet') return <WhatItDoesntYet />
  if (stepKey === 'theme') return <MakeItYours />
  if (stepKey === 'genres') {
    return (
      <PickGenres
        genres={genres}
        selected={pickedGenres}
        onToggle={onToggleGenre}
      />
    )
  }
  if (stepKey === 'artists') {
    return (
      <PickArtists
        artists={suggestions}
        selected={pickedArtists}
        onToggle={onToggleArtist}
        loading={suggestionsLoading}
        columns={columns}
      />
    )
  }
  if (stepKey === 'done') return <YoureIn />
  return null
}

/** Toggles a member of a selection set without mutating the previous one. */
const toggleIn = (
  previous: ReadonlySet<string>,
  value: string,
): Set<string> => {
  const next = new Set(previous)
  if (!next.delete(value)) next.add(value)
  return next
}

export interface OnboardingShellProps {
  /** Encoded pending action, already validated by the route. */
  intent?: string | null | undefined
  returnPath?: string | null | undefined
  /** Artist name for the mid-intent copy — null when there is no pending action. */
  destinationLabel?: string | null | undefined
  /** `menu` when opened from the account menu, so the rail reads "Close". */
  entry?: 'default' | 'menu' | undefined
  /** Tier chosen before sign-up, handed on to the destination (#1284). */
  pendingTier?: string | null | undefined
  /** Genre bucket labels, SSR-fetched. Empty is survivable: the step says so. */
  genres?: string[] | undefined
  /**
   * Server-derived from `x-vercel-ip-country`. Threaded because this shell can
   * open `TierPickerSheet`, and a missing value is invisible until a European
   * card reaches 3D Secure.
   */
  scaRegion?: boolean | undefined
}

export function OnboardingShell({
  intent = null,
  returnPath = null,
  destinationLabel = null,
  entry = 'default',
  pendingTier = null,
  genres = [],
  scaRegion = false,
}: OnboardingShellProps = {}) {
  const [index, setIndex] = useState(0)
  const router = useRouter()
  const mobileScrollRef = useRef<HTMLDivElement>(null)
  const total = FLOW.length
  const isFirst = index === 0
  const isLast = index === total - 1
  const stepKey = FLOW[index]!

  const destination = sanitizeReturnPath(returnPath)
  const hasPendingReturn = !!intent && !!destinationLabel
  const finishLabel = hasPendingReturn ? destinationLabel : null
  // The tour is a stop on the way, not the destination, so a tier picked before
  // sign-up has to survive it — otherwise the picker never reopens (#1284).
  const finishHref = appendPendingTier(
    hasPendingReturn
      ? buildReturnUrl({
          returnPath: destination,
          intent,
          label: destinationLabel,
        })
      : DEFAULT_RETURN_PATH,
    pendingTier,
  )
  // Mid-intent needs both halves: a label with no intent has nothing to replay,
  // and an intent with no label cannot be named in the copy. Skipping goes to
  // the same URL as finishing — leaving early is a choice about the tour, not an
  // abandonment of the watch the visitor came here to make.
  const skipMode: SkipMode = hasPendingReturn
    ? { kind: 'mid-intent', destinationLabel, href: finishHref }
    : entry === 'menu'
      ? { kind: 'menu' }
      : { kind: 'default', href: finishHref }

  const advance = useCallback(() => {
    mobileScrollRef.current?.scrollTo({ top: 0 })
    setIndex((ii) => Math.min(ii + 1, FLOW.length - 1))
  }, [])

  // ── Picker state ──────────────────────────────────────────────────────
  // Seeded from the sessionStorage mirror so an upgrade that unmounted this
  // tree comes back to the same selection (PK-18, OB-06).
  const [pickedGenres, setPickedGenres] = useState<ReadonlySet<string>>(
    () => new Set(readPicks(GENRE_PICKS_KEY)),
  )
  const [pickedArtists, setPickedArtists] = useState<ReadonlySet<string>>(
    () => new Set(readPicks(ARTIST_PICKS_KEY)),
  )
  useEffect(() => {
    writePicks(GENRE_PICKS_KEY, Array.from(pickedGenres))
  }, [pickedGenres])
  useEffect(() => {
    writePicks(ARTIST_PICKS_KEY, Array.from(pickedArtists))
  }, [pickedArtists])

  const toggleGenre = useCallback((genre: string) => {
    setPickedGenres((previous) => toggleIn(previous, genre))
  }, [])
  const toggleArtist = useCallback((slug: string) => {
    setPickedArtists((previous) => toggleIn(previous, slug))
  }, [])

  const { artists: suggestions, loading: suggestionsLoading } =
    useOnboardingSuggestions(Array.from(pickedGenres), stepKey === 'artists')

  const { data: planState } = usePlanState()
  const following = useEntitlement('following')
  // Never render locked while the plan is still resolving — an entitled user
  // would watch their own CTA change wording under them.
  const followLocked = !following.isLoading && !following.active
  const picksCommit = useArtistPicksCommit(advance)

  const onArtistsStep = stepKey === 'artists'
  const pickCount = pickedArtists.size
  const primaryLabel = onArtistsStep
    ? pickCount === 0
      ? pickCopy.skip
      : followLocked
        ? pickCopy.commitLocked(pickCount)
        : pickCopy.commit(pickCount)
    : isLast
      ? nav.finishButton(finishLabel)
      : nav.nextButton
  const primaryNote = onArtistsStep
    ? pickCount === 0
      ? pickCopy.subNone
      : followLocked
        ? pickCopy.subLocked
        : pickCopy.subSelected
    : isLast
      ? nav.finishFootnote(finishLabel)
      : null

  function goNext() {
    if (isLast) {
      router.push(finishHref)
      return
    }
    // The only step whose CTA writes anything. `commit` advances itself once
    // the write settles, or holds the step and opens the picker on a 403.
    if (onArtistsStep) {
      picksCommit.commit(Array.from(pickedArtists))
      return
    }
    advance()
  }

  const stepProps = {
    stepKey,
    genres,
    pickedGenres,
    onToggleGenre: toggleGenre,
    suggestions,
    suggestionsLoading,
    pickedArtists,
    onToggleArtist: toggleArtist,
  }

  function goBack() {
    if (isFirst) return
    mobileScrollRef.current?.scrollTo({ top: 0 })
    setIndex((ii) => ii - 1)
  }

  return (
    <>
      {/* Mobile layout (< 1240px) */}
      <div
        style={{
          height: '100dvh',
          background: 'var(--bg)',
          color: 'var(--fg)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter, system-ui',
        }}
        className="onboarding-mobile"
      >
        {/* Top chrome */}
        <header
          style={{
            flexShrink: 0,
            padding: '18px 20px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CCClusterMark
              size={22}
              color="var(--signal)"
              glow="var(--accent)"
            />
            <CCWordmark size={16} />
          </div>
          <SkipRail mode={skipMode} />
        </header>

        {/* Progress strip */}
        <div
          style={{
            flexShrink: 0,
            padding: '4px 22px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <ProgressDots total={total} index={index} />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--fg-subtle)',
            }}
          >
            {nav.stepLabels[stepKey]}
          </span>
        </div>

        {/* Scrollable body */}
        <div
          ref={mobileScrollRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '10px 22px 8px',
          }}
        >
          <div
            style={{
              minHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'safe center',
            }}
          >
            <StepContent {...stepProps} columns={PICK_COLUMNS_MOBILE} />
          </div>
        </div>

        {/* Nav */}
        <nav
          style={{
            flexShrink: 0,
            padding: '12px 22px 22px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Primary CTA */}
          <button
            type="button"
            onClick={goNext}
            disabled={picksCommit.pending}
            // `pending` keeps the label, so the button cannot change width
            // mid-write and shift the rail under a thumb (OB-10).
            aria-busy={picksCommit.pending}
            className="ob-btn-primary"
            style={{
              all: 'unset',
              cursor: picksCommit.pending ? 'default' : 'pointer',
              opacity: picksCommit.pending ? 0.7 : 1,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 52,
              borderRadius: 10,
              background: 'var(--signal)',
              color: 'var(--fg-on-accent)',
              fontFamily: 'Inter, system-ui',
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: '-0.01em',
              boxShadow: '0 12px 32px -12px var(--signal)',
            }}
          >
            {primaryLabel}
          </button>

          {primaryNote !== null && (
            <span
              style={{
                paddingTop: 10,
                textAlign: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: 'var(--fg-subtle)',
              }}
            >
              {primaryNote}
            </span>
          )}

          {/* Secondary row: back link + step counter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 14,
            }}
          >
            <button
              type="button"
              onClick={goBack}
              disabled={isFirst}
              className="ob-btn-back"
              style={{
                all: 'unset',
                cursor: isFirst ? 'default' : 'pointer',
                opacity: isFirst ? 0.4 : 1,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: 'var(--fg-muted)',
              }}
            >
              {nav.backButton}
            </button>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--fg-subtle)',
              }}
            >
              {nav.stepCounter(index + 1, total)}
            </span>
          </div>
        </nav>
      </div>

      {/* Desktop layout (≥ 1240px) */}
      <div style={{ display: 'none' }} className="onboarding-desktop">
        <OnboardingDesktop
          index={index}
          total={total}
          isFirst={isFirst}
          stepKey={stepKey}
          onNext={goNext}
          onBack={goBack}
          skipMode={skipMode}
          primaryLabel={primaryLabel}
          primaryNote={primaryNote}
          pending={picksCommit.pending}
          stepProps={stepProps}
        />
      </div>

      {/* Follow is Premium, so the only paywalled thing in the tour is the
          COMMIT. The picker keeps the selection behind it; closing it re-reads
          the plan and retries the write if the upgrade landed. */}
      <TierPickerSheet
        open={picksCommit.pickerOpen}
        onClose={picksCommit.closePicker}
        planState={planState ?? LOGGED_OUT_PLAN_STATE}
        scaRegion={scaRegion}
        entry="follow"
      />
    </>
  )
}

interface DesktopProps {
  index: number
  total: number
  isFirst: boolean
  stepKey: StepKey
  onNext: () => void
  onBack: () => void
  skipMode: SkipMode
  primaryLabel: string
  primaryNote: string | null
  pending: boolean
  stepProps: Omit<StepContentProps, 'columns'>
}

function OnboardingDesktop({
  index,
  total,
  isFirst,
  stepKey,
  onNext,
  onBack,
  skipMode,
  primaryLabel,
  primaryNote,
  pending,
  stepProps,
}: DesktopProps) {
  const cardBodyRef = useRef<HTMLDivElement>(null)
  const cardWidth =
    stepKey === 'artists' ? DESKTOP_PICKER_CARD_WIDTH : DESKTOP_CARD_WIDTH

  useEffect(() => {
    cardBodyRef.current?.scrollTo({ top: 0 })
  }, [index])

  return (
    <div
      style={{
        position: 'relative',
        height: '100dvh',
        background: 'var(--bg)',
        color: 'var(--fg)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui',
        overflow: 'hidden',
      }}
    >
      {/* Faint watermark — cluster mark top-right */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <CCClusterMark
          size={380}
          color="var(--fg)"
          style={{ opacity: 0.07, transform: 'rotate(-12deg)' }}
        />
      </div>

      {/* Outer header */}
      <header
        style={{
          position: 'relative',
          zIndex: 1,
          flexShrink: 0,
          padding: '22px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
          }}
        >
          {nav.railLabel}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CCClusterMark size={26} color="var(--signal)" glow="var(--accent)" />
          <CCWordmark size={20} />
        </div>
        <SkipRail mode={skipMode} />
      </header>

      {/* Centered card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 48px 32px',
        }}
      >
        <div
          style={{
            width: cardWidth,
            height: 640,
            borderRadius: 16,
            border: '1px solid var(--border-strong)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
            background: 'var(--bg-elevated)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Card header: progress dots + step label */}
          <div
            style={{
              flexShrink: 0,
              padding: '22px 32px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <ProgressDots total={total} index={index} />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--fg-subtle)',
              }}
            >
              {nav.stepLabels[stepKey]}
            </span>
          </div>

          {/* Card body */}
          <div
            ref={cardBodyRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '8px 32px 12px',
            }}
          >
            <div
              style={{
                minHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'safe center',
              }}
            >
              <StepContent {...stepProps} columns={PICK_COLUMNS_DESKTOP} />
            </div>
          </div>

          {/* Card nav */}
          <nav
            style={{
              flexShrink: 0,
              padding: '14px 32px 22px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <button
              type="button"
              onClick={onNext}
              disabled={pending}
              aria-busy={pending}
              className="ob-btn-primary"
              style={{
                all: 'unset',
                cursor: pending ? 'default' : 'pointer',
                opacity: pending ? 0.7 : 1,
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 52,
                borderRadius: 10,
                background: 'var(--signal)',
                color: 'var(--fg-on-accent)',
                fontFamily: 'Inter, system-ui',
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: '-0.01em',
                boxShadow: '0 12px 32px -12px var(--signal)',
              }}
            >
              {primaryLabel}
            </button>

            {primaryNote !== null && (
              <span
                style={{
                  paddingTop: 10,
                  textAlign: 'center',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-subtle)',
                }}
              >
                {primaryNote}
              </span>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 14,
              }}
            >
              <button
                type="button"
                onClick={onBack}
                disabled={isFirst}
                className="ob-btn-back"
                style={{
                  all: 'unset',
                  cursor: isFirst ? 'default' : 'pointer',
                  opacity: isFirst ? 0.4 : 1,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-muted)',
                }}
              >
                {nav.backButton}
              </button>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-subtle)',
                }}
              >
                {nav.stepCounter(index + 1, total)}
              </span>
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}
