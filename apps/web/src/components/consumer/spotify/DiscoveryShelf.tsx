'use client'

// "Based on your taste" shelf pinned atop Browse (#763 PR 8, from the
// discovery-surface.jsx mock). Premium + connected only — the shelf is a
// hidden-style surface for everyone else (spec §7): no locked preview, it
// simply doesn't render. Three visible states:
//   picks   — Spotify-marked header + horizontal card row + "All Denver
//             shows" divider handing off to the main list
//   empty   — QUIET MONTH (connected, no Denver matches this month)
//   failure — TASTE ON PAUSE (connection status error/revoked) with a
//             Reconnect action that opens the honesty-rail handoff sheet

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import type {
  SpotifyTastePick,
  SpotifyTastePickReason,
  SpotifyTastePicksResponse,
} from '@concert-crawl/types'
import { useEntitlement } from '@/lib/queries/use-entitlement'
import { useSpotifyConnection } from '@/lib/queries/use-spotify-connection'
import { useTastePicks } from '@/lib/queries/use-taste-picks'
import { writeShelfHint } from '@/lib/shelf-hint'
import { SpotifyLogo } from '@/components/brand/spotify-logo'
import { DiscoveryLoadingShelf } from './DiscoveryLoadingShelf'
import { FlexArt } from '@/components/consumer/image-slot'
import {
  SHELF_CARD_HEIGHT,
  SHELF_CARD_WIDTH,
} from '@/components/consumer/definitions/constants'
import {
  formatPrice,
  formatShortDate,
} from '@/components/consumer/definitions/lib'
import { SPOTIFY_COPY } from './definitions/copy'
import { StateBody, StateGlyphDisc } from './StateBody'
import { SignalButton } from './SpotifyButtons'
import { OAuthHandoffSheet } from './OAuthHandoffSheet'

const COPY = SPOTIFY_COPY.discovery

// Rank 1–5 reads as "top 5"; a deeper top-artist match reads as heavy
// rotation; a follow-only match reads as "Following".
const reasonLabel = (reason: SpotifyTastePickReason): string => {
  if (reason.kind === 'followed') return COPY.reasonFollowed
  return reason.rank <= 5 ? COPY.reasonTopFive : COPY.reasonTop
}

const ReasonChip = ({ reason }: { reason: SpotifyTastePickReason }) => (
  <span
    className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-[5px] font-bold text-fg"
    style={{
      padding: '2px 7px 2px 4px',
      fontSize: '9.5px',
      letterSpacing: '-0.005em',
      background: 'var(--surface-3)',
      border: '1px solid var(--border-strong)',
      fontFamily: 'var(--font-ui)',
    }}
  >
    <SpotifyLogo size={11} />
    <span className="sr-only">{COPY.reasonAriaPrefix}</span>
    {reasonLabel(reason)}
  </span>
)

const TastePickCard = ({ pick }: { pick: SpotifyTastePick }) => {
  const price = formatPrice(pick.ticketPriceMin, null)
  return (
    <li
      className="flex shrink-0"
      style={{ width: SHELF_CARD_WIDTH, height: SHELF_CARD_HEIGHT }}
      data-testid="taste-pick-card"
    >
      <Link
        href={`/events/${pick.eventId}`}
        className="flex w-full flex-col overflow-hidden rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
        }}
      >
        {/* A FILL REGION, and deliberately not a ratio (#1525 §2 / R3). The
            follow card beside this one is pinned to 3:4; this one cannot be.
            Its art absorbs whatever the show info leaves — the body has one
            row more than the follow card's, so the two cards share an outer box
            while their art does not — and pinning an aspect here is exactly
            what stretched the row in #763 r4. `FlexArt` carries no
            `aspectRatio` property at all, which is what makes that regression
            unreachable rather than merely avoided.

            `radius={0}`: the card shell already clips at 14px. */}
        <FlexArt
          surface="event"
          name={pick.artist}
          artworkUrl={pick.imageUrl}
          photoUrl={pick.artistPhotoUrl}
          radius={0}
        />
        <span
          className="flex shrink-0 flex-col gap-[7px]"
          style={{ padding: '10px 11px 12px' }}
        >
          <span className="flex">
            <ReasonChip reason={pick.reason} />
          </span>
          <span
            className="overflow-hidden text-ellipsis whitespace-nowrap font-extrabold leading-[1.15] text-fg"
            style={{
              fontSize: '14.5px',
              letterSpacing: '-0.015em',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {pick.artist}
          </span>
          <span
            className="overflow-hidden text-ellipsis whitespace-nowrap text-fg-muted"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.02em',
            }}
          >
            {pick.venueName}
            <span aria-hidden className="opacity-45">
              {COPY.venueDateSeparator}
            </span>
            {formatShortDate(pick.date)}
          </span>
          <span
            className="font-semibold"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: price !== null ? 'var(--signal)' : 'var(--fg-subtle)',
            }}
          >
            {price ?? COPY.priceTba}
          </span>
        </span>
      </Link>
    </li>
  )
}

const ShelfHeader = ({ eyebrow }: { eyebrow?: string }) => (
  <div className="mb-2.5 flex items-center gap-[9px]">
    <SpotifyLogo size={22} />
    <div className="min-w-0 flex-1">
      <h2
        className="font-extrabold text-fg"
        style={{
          fontSize: '16px',
          letterSpacing: '-0.02em',
          fontFamily: 'var(--font-ui)',
        }}
      >
        {COPY.title}
      </h2>
      {eyebrow && (
        <p
          className="font-bold uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.1em',
            color: 'var(--fg-subtle)',
          }}
        >
          {eyebrow}
        </p>
      )}
    </div>
  </div>
)

// Magnifier glyph for the quiet-month state (discovery-surface.jsx mock).
const QuietMonthGlyph = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden>
    <circle cx="13" cy="13" r="8.5" stroke="var(--fg-subtle)" strokeWidth="2" />
    <path
      d="M19 19l6 6"
      stroke="var(--fg-subtle)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
)

// Spotify mark with a warning badge (mock's failure glyph — mirrors the
// SpotifyStatusBanner badge treatment at state scale).
const PausedSpotifyGlyph = () => (
  <span className="relative inline-block">
    <SpotifyLogo size={62} />
    <span
      aria-hidden
      className="absolute flex h-6 w-6 items-center justify-center rounded-full text-[15px] font-black"
      style={{
        right: -4,
        bottom: -4,
        background: 'var(--warning)',
        color: 'var(--fg-on-accent)',
      }}
    >
      !
    </span>
  </span>
)

const DiscoveryEmpty = () => (
  <div className="flex flex-col py-4">
    <StateBody
      glyph={
        <StateGlyphDisc tone="muted">
          <QuietMonthGlyph />
        </StateGlyphDisc>
      }
      eyebrow={COPY.empty.eyebrow}
      eyebrowTone="muted"
      title={COPY.empty.title}
      body={COPY.empty.body}
    >
      <Link
        href="/events"
        className="inline-flex w-full items-center justify-center rounded-xl text-[15px] font-extrabold tracking-[-0.01em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        style={{
          padding: '13px 18px',
          background: 'var(--signal)',
          color: 'var(--fg-on-accent)',
          fontFamily: 'var(--font-ui)',
        }}
      >
        {COPY.empty.cta}
      </Link>
    </StateBody>
  </div>
)

const DiscoveryFailure = () => {
  const [handoffOpen, setHandoffOpen] = useState(false)
  return (
    <div className="flex flex-col py-4">
      <StateBody
        glyph={<PausedSpotifyGlyph />}
        eyebrow={COPY.failure.eyebrow}
        eyebrowTone="warning"
        title={COPY.failure.title}
        body={COPY.failure.body}
      >
        <SignalButton withLogo onClick={() => setHandoffOpen(true)}>
          {COPY.failure.primaryCta}
        </SignalButton>
        <Link
          href="/events"
          className="cursor-pointer rounded-lg py-2.5 text-center text-[14px] font-bold text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          style={{ fontFamily: 'var(--font-ui)' }}
        >
          {COPY.failure.secondaryCta}
        </Link>
      </StateBody>
      <OAuthHandoffSheet
        open={handoffOpen}
        onClose={() => setHandoffOpen(false)}
      />
    </div>
  )
}

export const DiscoveryShelf = ({
  initialPicks,
}: {
  // SSR seed from the events page — the gated endpoint already enforced the
  // spotify-sync entitlement server-side, so seeded data renders immediately
  // without waiting on the client plan-state round-trip (no pop-in).
  initialPicks?: SpotifyTastePicksResponse
}) => {
  const { userId } = useAuth()
  const entitlement = useEntitlement('spotify-sync')
  const connection = useSpotifyConnection()
  const picksQuery = useTastePicks(entitlement.active, initialPicks)

  // Record whether this viewer gets a shelf, so the Browse route's loading
  // fallback can reserve its footprint next time (see lib/shelf-hint).
  // `null` = not yet resolved: never overwrite a good hint with a guess made
  // mid-resolution, or every cold load would clear it before it settles.
  // Deliberately coarser than the render tree below — entitled + a live
  // connection means SOME shelf paints (picks, quiet-month, or the failure
  // state), all of which occupy the same slot. Over-reserving on a picks
  // error costs one empty gap; under-reserving costs the shove we're fixing.
  const shelfHint: boolean | null = entitlement.isLoading
    ? null
    : !entitlement.active
      ? false
      : connection.data === undefined
        ? null
        : connection.data.status !== 'disconnected'
  useEffect(() => {
    if (shelfHint !== null && userId) writeShelfHint(userId, shelfHint)
  }, [shelfHint, userId])

  // Hidden-style surface (spec §7): nothing once the entitlement resolves
  // inactive, and nothing without data. While the client entitlement is
  // still resolving, seeded/cached data renders immediately (the gated
  // endpoint already proved entitlement) instead of popping in later.
  if (!entitlement.isLoading && !entitlement.active) return null

  // Connection override — corrects for useTastePicks' 5-min staleTime,
  // which otherwise lets a stale 'connected' picks cache paint after the
  // user disconnects or the connection flips to error/revoked. Mirrors
  // the picks response's own status handling: 'disconnected' is
  // hidden-style, 'error'/'revoked' render the "taste on pause" failure
  // shelf (§8) with a Reconnect handoff — we don't wait for the picks
  // response to refetch to surface that.
  //
  // GATED on entitlement eligibility: while entitlement is still
  // resolving, a non-entitled user with an error/revoked connection must
  // NOT see the failure shelf (they'd be shown a paid-feature UI they
  // aren't entitled to). SSR-seeded initialPicks also proves entitlement
  // (the gated endpoint enforced it server-side), so it's a valid
  // eligibility signal even while the client entitlement is loading.
  const isEligibleForShelf = entitlement.active || initialPicks !== undefined
  if (isEligibleForShelf) {
    const connectionStatus = connection.data?.status
    if (connectionStatus === 'disconnected') return null
    if (connectionStatus === 'error' || connectionStatus === 'revoked') {
      return (
        <section aria-label={COPY.title} className="mb-5 pt-1.5">
          <ShelfHeader />
          <DiscoveryFailure />
        </section>
      )
    }
  }

  const { data, isError, isPending } = picksQuery

  // Loading shelf reserves the shelf footprint (zero layout shift) when we
  // KNOW the user is Spotify-connected but picks haven't returned — the
  // narrow gap where SSR didn't seed (cold hydration, entitlement upgrade
  // mid-session, cache miss). All three signals required so we never flash
  // a shelf that may not apply.
  if (
    isPending &&
    !isError &&
    entitlement.active &&
    connection.data?.status === 'connected'
  ) {
    return <DiscoveryLoadingShelf onRetry={() => void picksQuery.refetch()} />
  }

  if (isPending || isError || !data || data.status === 'disconnected') {
    return null
  }

  return (
    <section aria-label={COPY.title} className="mb-5 pt-1.5">
      {data.status !== 'connected' ? (
        <>
          <ShelfHeader />
          <DiscoveryFailure />
        </>
      ) : data.picks.length === 0 ? (
        <>
          <ShelfHeader />
          <DiscoveryEmpty />
        </>
      ) : (
        <>
          <ShelfHeader
            eyebrow={
              data.picks.length === 1
                ? COPY.eyebrowSingular
                : COPY.eyebrow(data.picks.length)
            }
          />
          {/* #33: FOUR prior fixes tried to contain the carousel via
              ancestor overflow-x: clip (#1149 main, #1156 html, #1157
              layout div, #1158 local wrapper). None worked because the
              actual leak wasn't going through ancestor overflow at all —
              it was the `<span class="sr-only">` inside each reason
              chip. Tailwind's `.sr-only` uses `position: absolute` with
              no top/left/right/bottom offsets. Absolute-positioned
              elements resolve their containing block to the nearest
              POSITIONED ancestor; when nothing in the chain is
              positioned, the containing block collapses to the ROOT
              (<html>). That routes their rendered rect (at the flex
              layout's natural x position for card N — off-screen for
              N>3) straight to `html.scrollWidth`, bypassing every
              overflow-clip container in between. `display:none` on the
              <ul> made it vanish because the sr-only spans disappeared
              with the cards, which is what fooled the earlier diagnoses
              into thinking the ul itself was the source.
              Fix: `relative` makes this wrapper a positioned ancestor,
              so the sr-only spans' containing block becomes the wrapper
              itself, and its `overflow-hidden` finally contains them.
              `max-w-[100vw]` + `overflow-hidden` remain as belt-and-
              suspenders for any other stray overflow. */}
          <div className="relative -mx-4 max-w-[100vw] overflow-hidden sm:mx-0 sm:max-w-full">
            <ul
              aria-label={COPY.listAria}
              className="flex list-none gap-[11px] overflow-x-auto px-4 pb-1 pt-0.5 sm:px-0"
            >
              {data.picks.map((pick) => (
                <TastePickCard key={pick.eventId} pick={pick} />
              ))}
            </ul>
          </div>
          {/* Hand-off divider into the main list (mock: "All Denver shows"). */}
          <div className="flex items-center gap-2 pt-[18px]">
            <span
              className="font-extrabold uppercase text-fg"
              style={{
                fontSize: '12px',
                letterSpacing: '0.05em',
                fontFamily: 'var(--font-ui)',
              }}
            >
              {COPY.allShowsDivider}
            </span>
            <div
              aria-hidden
              className="h-px flex-1"
              style={{ background: 'var(--border)' }}
            />
          </div>
        </>
      )}
    </section>
  )
}
