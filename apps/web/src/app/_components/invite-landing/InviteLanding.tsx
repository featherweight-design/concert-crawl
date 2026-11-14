'use client';

import Link from 'next/link';
import { CCMark } from '@/components/brand/cc-mark';
import { CCWordmark } from '@/components/brand/cc-wordmark/CCWordmark';
import { BetaPill } from '@/components/brand/beta-pill/BetaPill';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { LANDING_COPY } from '../definitions/copy';
import { InviteCodeField } from './InviteCodeField';
import { ShowFan } from './ShowFan';
import { WeekTicker } from './WeekTicker';
import type { InviteShow, InviteVenue } from './definitions/types';
import {
  FOCUS_RING,
  INVITE_GRADIENT,
  INVITE_PAGE_WASH,
  MONO_CAPS,
} from './definitions/styles';

const COPY = LANDING_COPY.invite;

/** Desktop shows twelve venue icons; the phone board fits eight. */
const DESKTOP_TILES = 12;
const PHONE_TILES = 8;

interface InviteLandingProps {
  shows: InviteShow[];
  /** Null when the venue list could not be read: the row and count drop. */
  venues: InviteVenue[] | null;
  onJoinWaitlist: () => void;
}

const accentWord = LANDING_COPY.hero.headingAccent.replace(/\.$/, '');
const accentStop = LANDING_COPY.hero.headingAccent.endsWith('.') ? '.' : '';

/**
 * The private-beta landing (B+ B24): the pitch, an inline invite-code field,
 * a fan of this week's shows and the venues we crawl. Before launch nothing
 * here links into the gated browse surface (#794).
 */
export function InviteLanding({
  shows,
  venues,
  onJoinWaitlist,
}: InviteLandingProps) {
  const waitlistChip = (
    <button
      type="button"
      onClick={onJoinWaitlist}
      className={FOCUS_RING}
      style={{
        minHeight: 44,
        padding: '0 16px',
        borderRadius: 10,
        border: '1px solid var(--border-strong)',
        // `inv-mob`: a filled surface, not a transparent button on the wash.
        background: 'var(--surface-1)',
        color: 'var(--fg)',
        fontFamily: 'Inter, system-ui',
        fontWeight: 700,
        fontSize: 14,
        cursor: 'pointer',
      }}
    >
      {LANDING_COPY.cta.waitlist}
    </button>
  );

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: INVITE_PAGE_WASH,
        color: 'var(--fg)',
        fontFamily: 'Inter, system-ui',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'clip',
      }}
    >
      {/* The screen's one ambient glow (B+ rule 1), behind the card fan. */}
      <div
        aria-hidden
        className="right-[-20%] top-[28%] lg:right-[-6%] lg:top-[12%]"
        style={{
          position: 'absolute',
          width: 'min(110vw, 760px)',
          aspectRatio: '1',
          background:
            'radial-gradient(closest-side, color-mix(in oklch, var(--accent) 22%, transparent), transparent)',
          pointerEvents: 'none',
        }}
      />

      <header
        // Below 360 the lockup and the beta pill share one row, as the 320
        // board draws it (addendum 2, 15-320px/invite-320): 16px sides and a
        // 16px wordmark.
        className="px-[22px] pt-5 max-[360px]:px-4 lg:px-12 lg:pt-7"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* The app-icon tile, as the B+ invite boards draw it: the mark in a
              7px-radius tile with a hairline, so it reads as an icon on any
              theme's ground rather than a bare glyph. */}
          <span
            data-testid="invite-app-icon"
            style={{
              display: 'block',
              // The svg is inline; without this the line box adds a strip
              // under it. The board's svg is display:block.
              lineHeight: 0,
              flex: 'none',
              borderRadius: 7,
              overflow: 'hidden',
              border: '1px solid var(--border)',
            }}
          >
            <CCMark size={28} />
          </span>
          <CCWordmark size={20} className="max-[360px]:!text-[16px]" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <BetaPill />
          <Link
            href="/sign-in"
            className={`hidden lg:inline-flex items-center ${FOCUS_RING}`}
            style={{
              minHeight: 44,
              padding: '0 6px',
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--fg-muted)',
              textDecoration: 'none',
            }}
          >
            {COPY.signInLink}
          </Link>
        </div>
      </header>

      <main
        className="flex flex-1 flex-col gap-7 px-[22px] pb-12 pt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-x-12 lg:px-12 lg:pt-10"
        style={{ position: 'relative' }}
      >
        <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
          <h1
            // Sized to the boards (xcheck row 38): inv-mob sets the headline at
            // about 11.3vw (44px at 390, so 36px at 320); inv-desk at about
            // 5.55vw, 80px at its 1440 frame, which is the cap.
            className="[font-size:clamp(36px,11.3vw,60px)] lg:[font-size:clamp(52px,5.55vw,80px)]"
            style={{
              margin: 0,
              fontWeight: 900,
              letterSpacing: '-0.045em',
              lineHeight: 0.92,
            }}
          >
            {LANDING_COPY.hero.headingLine1}
            <br />
            {LANDING_COPY.hero.headingLine2}
            <br className="max-lg:hidden" />{' '}
            <span
              style={{
                background: INVITE_GRADIENT,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {accentWord}
            </span>
            <span style={{ color: 'var(--accent)' }}>{accentStop}</span>
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 'clamp(16px, 1.6vw, 19px)',
              color: 'var(--fg-muted)',
              lineHeight: 1.45,
              maxWidth: '40ch',
            }}
          >
            {LANDING_COPY.hero.subheading}
          </p>
        </div>

        <div className="-mx-[22px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mx-0">
          <ShowFan shows={shows} />
        </div>

        <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-2 lg:max-w-[480px]">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ ...MONO_CAPS, color: 'var(--fg-subtle)' }}>
              {COPY.eyebrow}
            </span>
            <InviteCodeField />
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>
              {COPY.noCode}
            </span>
            {waitlistChip}
          </div>
          <div className="flex flex-col gap-4 lg:hidden">
            <div className="[&>button]:w-full">{waitlistChip}</div>
            <p
              style={{
                margin: 0,
                textAlign: 'center',
                fontSize: 14,
                color: 'var(--fg-muted)',
              }}
            >
              {COPY.signInPrompt}{' '}
              <Link
                href="/sign-in"
                className={FOCUS_RING}
                style={{
                  color: 'var(--fg)',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                {COPY.signInLink}
              </Link>
            </p>
          </div>

          {venues !== null && venues.length > 0 && (
            <div className="mt-3 flex flex-col items-center gap-3 lg:items-start">
              {/* 6px gaps, as both boards space the row: twelve 30px tiles
                  (426px) fit the 480px column on one line. It still wraps in a
                  narrower column (768-1100), which no board draws. */}
              <div className="flex flex-wrap justify-center gap-1.5 lg:justify-start">
                {venues.slice(0, DESKTOP_TILES).map((venue, index) => (
                  <span
                    key={venue.slug}
                    className={
                      index >= PHONE_TILES ? 'max-lg:hidden' : undefined
                    }
                  >
                    <VenueTile
                      slug={venue.slug}
                      name={venue.name}
                      size={30}
                      edgeWeight={1.2}
                    />
                  </span>
                ))}
              </div>
              <span style={{ ...MONO_CAPS, color: 'var(--fg-muted)' }}>
                {COPY.venueCount(venues.length)}
              </span>
            </div>
          )}
        </div>
      </main>

      <WeekTicker shows={shows} />
    </div>
  );
}
