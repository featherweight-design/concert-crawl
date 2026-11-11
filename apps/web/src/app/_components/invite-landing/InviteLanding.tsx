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
import { FOCUS_RING, INVITE_GRADIENT, MONO_CAPS } from './definitions/styles';

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
        background: 'transparent',
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
        background: 'var(--bg)',
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
        className="right-[-20%] top-[28%] md:right-[-6%] md:top-[12%]"
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
        className="px-[22px] pt-5 md:px-12 md:pt-7"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CCMark size={26} />
          <CCWordmark size={20} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <BetaPill />
          <Link
            href="/sign-in"
            className={`hidden md:inline-flex items-center ${FOCUS_RING}`}
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
        className="flex flex-1 flex-col gap-7 px-[22px] pb-12 pt-6 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-x-12 md:px-12 md:pt-10"
        style={{ position: 'relative' }}
      >
        <div className="flex flex-col gap-4 md:col-start-1 md:row-start-1">
          <h1
            style={{
              margin: 0,
              fontWeight: 900,
              fontSize: 'clamp(40px, 11vw, 96px)',
              letterSpacing: '-0.045em',
              lineHeight: 0.92,
            }}
          >
            {LANDING_COPY.hero.headingLine1}
            <br />
            {LANDING_COPY.hero.headingLine2}
            <br className="max-md:hidden" />{' '}
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

        <div className="-mx-[22px] md:col-start-2 md:row-span-2 md:row-start-1 md:mx-0">
          <ShowFan shows={shows} />
        </div>

        <div className="flex flex-col gap-4 md:col-start-1 md:row-start-2 md:max-w-[480px]">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ ...MONO_CAPS, color: 'var(--fg-subtle)' }}>
              {COPY.eyebrow}
            </span>
            <InviteCodeField />
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <span style={{ fontSize: 14, color: 'var(--fg-muted)' }}>
              {COPY.noCode}
            </span>
            {waitlistChip}
          </div>
          <div className="flex flex-col gap-4 md:hidden">
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
            <div className="mt-3 flex flex-col items-center gap-3 md:items-start">
              <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                {venues.slice(0, DESKTOP_TILES).map((venue, index) => (
                  <span
                    key={venue.slug}
                    className={
                      index >= PHONE_TILES ? 'max-md:hidden' : undefined
                    }
                  >
                    <VenueTile slug={venue.slug} name={venue.name} size={34} />
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
