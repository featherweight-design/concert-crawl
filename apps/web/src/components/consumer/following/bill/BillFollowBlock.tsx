'use client';

// The bill follow block on event detail (native following, PR 7).
//
// It is a SLOT, not a screen: the event-detail pages hand it in through one
// optional prop and it renders itself, so neither detail surface is forked to
// carry it (design table ED-06).
//
// Following is on every plan, so the rows are always independent and the bulk
// action is a convenience rather than the only way through. Signed out, every
// row recruits to sign-up and the bulk action is withheld.
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

import React, { useId } from 'react';
import Link from 'next/link';

import { FollowButton } from '@/components/consumer/artist-page/FollowButton';
import {
  NF_FOLLOW_SIZES,
  NF_TAP_MIN,
} from '@/components/consumer/artist-page/definitions/constants';

import { BILL_FOLLOW_COPY } from './definitions/copy';
import type { BillArtist } from './lib/bill-artists';
import { useBillFollows } from './lib/use-bill-follows';

const COPY = BILL_FOLLOW_COPY;

// The bulk action sits in the header at the same density as the row buttons it
// is a shortcut for. It used to draw `primary` full-width below the list, which
// made a convenience read as the section's primary action.
const BULK = NF_FOLLOW_SIZES.row;

/** How far the invisible target grows past the pill, on every side. */
const BULK_GROW = (NF_TAP_MIN - BULK.height) / 2;

// The row's artist name draws identically whether or not it links, so the two
// branches share these rather than restating them and drifting apart.
const NAME_CLASS = 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap';
const NAME_STYLE: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: '-0.01em',
  color: 'var(--fg)',
};

export interface BillFollowBlockProps {
  /** Headliner first, then support. Slug-less names are dropped upstream. */
  artists: BillArtist[];
  /** The public mirror at /e/:id. Rows recruit; the bulk action is withheld. */
  signedOut?: boolean;
  /** Unread since the tier picker left this block; the scaRegion removal
   *  takes it off the event pages' call sites. */
  scaRegion?: boolean;
}

export const BillFollowBlock = ({
  artists,
  signedOut = false,
}: BillFollowBlockProps) => {
  // useId, not a module counter: two blocks could share a page, and a
  // colliding id would point the heading's label at the wrong node.
  const uid = useId().replace(/:/g, '');
  const titleId = `nf-bill-title-${uid}`;

  const follows = useBillFollows(artists);

  // Hooks above this line run unconditionally.
  if (artists.length === 0) return null;

  const unfollowed = artists.filter(
    (artist) => !follows.following.has(artist.slug),
  );

  // ED-03: the bulk action disappears once there is nothing left to commit.
  // Withheld entirely while signed out — every row already routes to sign-up,
  // and a second route to the same place in the same block is noise.
  //
  // A one-act bill is the same case: the row's own button already reads
  // "Follow", so a bulk action beside it offers one decision twice.
  const showBulk = !signedOut && unfollowed.length > 1;
  const bulkLabel = COPY.followAll(unfollowed.length);

  const onBulkClick = () => {
    // Honour `aria-disabled` here rather than only in the hook. The hook's ref
    // guard already makes a second tap a no-op, but a control that announces
    // itself as disabled and still runs its handler is the inconsistency the
    // attribute exists to prevent.
    if (follows.committing) return;
    follows.followAll();
  };

  // Quiet `row`, in the header beside the title. It is a shortcut for the rows
  // below it, not the section's own CTA, and the filled pill it used to draw
  // made it read as the latter (R3 rule 1: one loud follow per screen, and on
  // event detail that one is the Watch card, not this).
  const bulkButton = (
    <button
      type="button"
      className="ap-follow"
      data-testid="bill-follow-all"
      onClick={onBulkClick}
      // An action, not a toggle — `aria-pressed` would announce a switch
      // that has no off.
      aria-busy={follows.committing || undefined}
      // `aria-disabled`, never `disabled`: a disabled button drops focus
      // to the body mid-commit. The ref guard swallows the second tap.
      aria-disabled={follows.committing || undefined}
      aria-label={follows.committing ? COPY.followAllPendingAria : undefined}
      style={{
        all: 'unset',
        boxSizing: 'border-box',
        cursor: 'pointer',
        // The hit overlay below is absolute against this.
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: BULK.gap,
        height: BULK.height,
        minHeight: BULK.height,
        padding: BULK.padding,
        borderRadius: BULK.radius,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 700,
        fontSize: BULK.fontSize,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
        // The title beside it owns the flexible width and ellipsises; the
        // pill never shrinks or wraps.
        flexShrink: 0,
        // The pending skin is opacity only — the label and therefore the
        // width never change, so the control cannot move out from under
        // the finger that is still on it (ED-04).
        opacity: follows.committing ? 0.72 : 1,
        background: 'transparent',
        color: 'var(--fg)',
        border: '1px solid var(--border-strong)',
      }}
    >
      {/* The pill draws at 28 and the target stays 44, the same bargain every
          quiet follow control strikes. */}
      <span
        aria-hidden
        data-hit-overlay=""
        style={{ position: 'absolute', inset: -BULK_GROW }}
      />
      {bulkLabel}
    </button>
  );

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
      {/* The shortcut lives in this row, so the row is centred rather than
          baseline-aligned: a 28px pill hung off a 13px baseline sits low. The
          title and the count keep their own baseline inside the left group. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div
          className="min-w-0"
          style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}
        >
          <h2
            id={titleId}
            className="overflow-hidden text-ellipsis whitespace-nowrap"
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '-0.01em',
              color: 'var(--fg)',
            }}
          >
            {COPY.title}
          </h2>
          {/* The bill's size, which is not what the shortcut counts — that one
              counts what is left to follow. On a 3-act bill with one already
              followed the two legitimately read 3 and 2. */}
          <span
            style={{
              flexShrink: 0,
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
        {showBulk && bulkButton}
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
            {/* min-w-0 for the same reason as FollowDateLine: this is a flex
                item in a ROW, so its automatic minimum size is the whole
                artist name, and a long one would shove the follow button off
                the end rather than ellipsising.

                Signed in the name is the way to the artist page, exactly as
                the title block's headliner is. Signed out it stays plain
                text: `/artists/:slug` is behind auth and is deliberately not
                in `isAlwaysPublic`, so a link there from the public mirror
                would send a visitor to a sign-in wall instead of an artist.

                The anchor stretches to the row rather than hugging its text —
                a 14px line is a 20px target, and the row is already 44. That
                makes it a flex CONTAINER, and `text-overflow` does not apply
                to one: the text becomes an anonymous flex item and the
                ellipsis is never drawn. So the truncation stays on an inner
                span in both branches, and the anchor only carries `min-w-0`
                so that span has room to shrink into. */}
            {signedOut ? (
              <span className={NAME_CLASS} style={NAME_STYLE}>
                {artist.name}
              </span>
            ) : (
              <Link
                href={`/artists/${artist.slug}`}
                className="flex min-w-0 items-center underline-offset-4 hover:underline focus-visible:underline"
                style={{ alignSelf: 'stretch' }}
              >
                <span className={NAME_CLASS} style={NAME_STYLE}>
                  {artist.name}
                </span>
              </Link>
            )}
            {/* Quiet at `row`: a bill can carry four of these, and four
                filled pills made the button the section's subject. The 28px
                pill still owns a 44px target, so nothing is asked of the row
                it sits in. */}
            <FollowButton
              name={artist.name}
              following={follows.following.has(artist.slug)}
              signedOut={signedOut}
              size="row"
              onToggle={() => follows.toggle(artist.slug)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
};
