'use client'

// The bill follow block on event detail (native following, PR 7).
//
// It is a SLOT, not a screen: the event-detail pages hand it in through one
// optional prop and it renders itself, so neither detail surface is forked to
// carry it (design table ED-06).
//
// ⚠️ ONE PAYWALL, ONE TAP (ED-05). Below Premium the whole block is a single
// gate: the per-row buttons are not drawn at all and one locked action stands
// in for them. A four-act bill that draws four locks asks a free user to meet
// the same wall four times, which is the state this rule exists to forbid.
// Above Premium the rows are independent again and the bulk action is a
// convenience rather than the only way through.
//
// This holds for a viewer who downgraded while already following acts on the
// bill: locked draws the at-rest skin and no Following state, exactly as
// `ShelfCard` does. Their follows are not lost — DELETE is ungated at the API
// and the artist page still unfollows — but a surface whose whole job is the
// upsell is not the place to hand a lapsed viewer four toggles.
//
// ⚠️ Following an act here does NOT touch the event's watch state (ED-08).
// Watching is the show; following is the artist. Nothing in this block's copy
// may suggest otherwise.
//
// ONE LAYOUT AT EVERY WIDTH. The handoff draws this in a 340px right rail
// beneath the Watch card (ED-07), but neither shipped event-detail screen has
// a rail — both are a single 880px centred column — so the block sits in that
// column directly under the Watch CTA on mobile and desktop alike. Parity is
// therefore structural: there is no breakpoint at which one viewport gets a
// block the other does not.

import { useId, useState } from 'react'
import type { PickerEntry } from '@concert-crawl/types'

import { FollowButton } from '@/components/consumer/artist-page/FollowButton'
import { NF_FOLLOW_SIZES } from '@/components/consumer/artist-page/definitions/constants'
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy'
import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants'
import { TierPickerSheet } from '@/components/consumer/tier-picker/lazy'
import { useEntitlement } from '@/lib/queries/use-entitlement'
import { usePlanState } from '@/lib/queries/use-plan-state'

import { BILL_FOLLOW_COPY } from './definitions/copy'
import type { BillArtist } from './lib/bill-artists'
import { useBillFollows } from './lib/use-bill-follows'

const COPY = BILL_FOLLOW_COPY

// The bulk action borrows the `full` geometry so it reads as the block's own
// primary control rather than as a fifth row button.
const BULK = NF_FOLLOW_SIZES.full

const LockGlyph = () => (
  <svg
    data-glyph="lock"
    width={BULK.glyph}
    height={BULK.glyph}
    viewBox="0 0 12 14"
    fill="none"
    stroke="currentColor"
    aria-hidden
    style={{ flexShrink: 0 }}
  >
    <rect x="1.2" y="6" width="9.6" height="7" rx="2" strokeWidth={1.5} />
    <path d="M3.6 6V4.2a2.4 2.4 0 014.8 0V6" strokeWidth={1.5} />
  </svg>
)

export interface BillFollowBlockProps {
  /** Headliner first, then support. Slug-less names are dropped upstream. */
  artists: BillArtist[]
  /** The public mirror at /e/:id. Rows recruit; the bulk action is withheld. */
  signedOut?: boolean
  /** Server-resolved, forwarded to the picker's checkout legal block. */
  scaRegion: boolean
}

export const BillFollowBlock = ({
  artists,
  signedOut = false,
  scaRegion,
}: BillFollowBlockProps) => {
  const { surface } = useEntitlement('following')
  const { data: planState } = usePlanState()
  const [pickerOpen, setPickerOpen] = useState(false)

  // useId, not a module counter: two blocks could share a page, and a
  // colliding id aims every gate sentence at one node.
  const uid = useId().replace(/:/g, '')
  const titleId = `nf-bill-title-${uid}`
  const gateId = `nf-bill-gate-${uid}`

  const onEntitlementRequired = () => setPickerOpen(true)
  const follows = useBillFollows(artists, onEntitlementRequired)

  // Signed out draws the at-rest skin and routes to sign-up, per #794 §3.10 —
  // there is no plan to lock a visitor out of. Fails OPEN while the plan is
  // still resolving: showing a paying subscriber an upgrade-shaped block is
  // the worse of the two wrong answers, and the server enforces regardless.
  const locked = !signedOut && surface !== null && surface !== 'visible-active'

  const pickerEntry: PickerEntry =
    surface === 'tier-picker-on-tap' ? 'logged-out-follow' : 'paywall'

  // Hooks above this line run unconditionally.
  if (artists.length === 0) return null

  const unfollowed = artists.filter(
    (artist) => !follows.following.has(artist.slug),
  )

  // ED-03: the bulk action disappears once there is nothing left to commit.
  // Withheld entirely while signed out — every row already routes to sign-up,
  // and a second route to the same place in the same block is noise.
  //
  // A one-act bill is the same case: the row's own button already reads
  // "Follow", so a bulk action beside it offers one decision twice. Locked is
  // the exception, because the rows are not drawn at all there (ED-05) and
  // this is the block's only control however many acts are on the bill.
  const showBulk =
    !signedOut && unfollowed.length > 0 && (locked || unfollowed.length > 1)
  const bulkLabel = COPY.followAll(locked ? artists.length : unfollowed.length)

  const onBulkClick = () => {
    // Honour `aria-disabled` here rather than only in the hook. The hook's ref
    // guard already makes a second tap a no-op, but a control that announces
    // itself as disabled and still runs its handler is the inconsistency the
    // attribute exists to prevent.
    if (follows.committing) return
    if (locked) {
      setPickerOpen(true)
      return
    }
    follows.followAll()
  }

  return (
    <section
      aria-labelledby={titleId}
      data-testid="bill-follow-block"
      style={{
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
        padding: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <h2
          id={titleId}
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '-0.01em',
            color: 'var(--fg)',
          }}
        >
          {COPY.title}
        </h2>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            letterSpacing: '0.06em',
            color: 'var(--fg-subtle)',
          }}
        >
          {artists.length === 1
            ? COPY.countSingular
            : COPY.count(artists.length)}
        </span>
      </div>

      <p
        style={{
          marginTop: 4,
          fontSize: 12.5,
          lineHeight: 1.5,
          color: 'var(--fg-muted)',
        }}
      >
        {COPY.body}
      </p>

      <ul style={{ marginTop: 10, listStyle: 'none', padding: 0 }}>
        {artists.map((artist) => (
          <li
            key={artist.slug}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              minHeight: 44,
              borderTop: '1px solid var(--border)',
            }}
          >
            <span
              className="overflow-hidden text-ellipsis whitespace-nowrap"
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'var(--fg)',
              }}
            >
              {artist.name}
            </span>
            {/* `md` (44), never `sm`: NF_FOLLOW_SIZES permits 36 only where the
                containing row is itself the tap target, and this row is not —
                the button is the only place the follow can be tapped. */}
            {!locked && (
              <FollowButton
                name={artist.name}
                following={follows.following.has(artist.slug)}
                signedOut={signedOut}
                size="md"
                onToggle={() => follows.toggle(artist.slug)}
                // Unreachable while `locked` is false; a stale entitlement
                // comes back as a 403 and lands on the same picker.
                onLockedTap={onEntitlementRequired}
              />
            )}
          </li>
        ))}
      </ul>

      {showBulk && (
        <button
          type="button"
          className="ap-follow"
          data-testid="bill-follow-all"
          onClick={onBulkClick}
          // An action, not a toggle — `aria-pressed` would announce a switch
          // that has no off. Locked it is a dialog trigger and says so.
          aria-haspopup={locked ? 'dialog' : undefined}
          aria-describedby={locked ? gateId : undefined}
          aria-busy={follows.committing || undefined}
          // `aria-disabled`, never `disabled`: a disabled button drops focus
          // to the body mid-commit. The ref guard swallows the second tap.
          aria-disabled={follows.committing || undefined}
          aria-label={
            follows.committing ? COPY.followAllPendingAria : undefined
          }
          style={{
            all: 'unset',
            boxSizing: 'border-box',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: BULK.gap,
            marginTop: 12,
            width: '100%',
            height: BULK.height,
            minHeight: BULK.height,
            padding: BULK.padding,
            borderRadius: 10,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 800,
            fontSize: BULK.fontSize,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            // The pending skin is opacity only — the label and therefore the
            // width never change, so the control cannot move out from under
            // the finger that is still on it (ED-04).
            opacity: follows.committing ? 0.72 : 1,
            ...(locked
              ? {
                  background: 'transparent',
                  color: 'var(--fg)',
                  border: '1px solid var(--border-strong)',
                }
              : {
                  background: 'var(--signal)',
                  color: 'var(--fg-on-accent)',
                  border: '1px solid var(--signal)',
                }),
          }}
        >
          {locked && <LockGlyph />}
          {bulkLabel}
        </button>
      )}

      {/* Visually hidden by CLIP, not `hidden`: the hidden attribute drops a
          node from the a11y tree, so an aria-describedby aimed at it announces
          nothing at all. */}
      {locked && (
        <span
          id={gateId}
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {FOLLOWING_COPY.followGate}
        </span>
      )}

      <TierPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        planState={planState ?? LOGGED_OUT_PLAN_STATE}
        scaRegion={scaRegion}
        entry={pickerEntry}
      />
    </section>
  )
}
