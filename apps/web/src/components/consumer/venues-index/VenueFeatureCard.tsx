'use client';

import Link from 'next/link';
import {
  IdentityArt,
  ia_getInitials,
  ia_isDark,
  identityFor,
} from '../identity-art/IdentityArt';
import { VenueNeonArt, venueGlyphKey } from '../venue-glyph';
import { VenueName } from '../venue-name/VenueName';
import {
  fmtNum,
  fmtDistance,
  type VenueWithDistance,
} from './venue-filter-defs';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const VENUES_INDEX_COPY = CONSUMER_COPY.venuesIndex;

/** The FLAGSHIP chip sits on a dark pill whatever the theme, so a fixed neon. */
export const FLAGSHIP_CHIP_COLOR = '#FFE36B'; // fwd-allow-hex: board art colour

/**
 * The flagship card edge: a cyan, violet, pink gradient border over the card
 * surface, with a soft warm glow outside it (bp-venues.jpg, bp-m-venues_m.jpg).
 */
const FLAGSHIP_EDGE = {
  border: '1px solid transparent',
  background:
    'linear-gradient(var(--surface-1), var(--surface-1)) padding-box, linear-gradient(135deg, var(--signal), var(--genre-metal) 50%, var(--accent)) border-box',
  boxShadow:
    '0 10px 40px -10px color-mix(in oklab, var(--accent) 35%, transparent), 0 0 24px -6px color-mix(in oklab, var(--warning) 25%, transparent)',
} as const;

interface VenueFeatureCardProps {
  venue: VenueWithDistance;
}

export function VenueFeatureCard({ venue }: VenueFeatureCardProps) {
  const identity = identityFor(venue.name, 'venue');
  const dark = ia_isDark(identity.palette.bg);
  const initials = ia_getInitials(venue.name, 2);
  const glyphKey = venueGlyphKey(venue.slug);

  return (
    <Link href={`/venues/${venue.slug}`} className="group block w-full">
      {/* Desktop — horizontal card */}
      <div
        data-testid="venue-feature-card-desktop"
        className="relative hidden lg:grid rounded-[14px] overflow-hidden"
        style={{ ...FLAGSHIP_EDGE, gridTemplateColumns: '360px 1fr' }}
      >
        {/* Hover layer: sits over the card, never touches the padding-box
            gradient layers, so the border keeps its gradient. A tint plus an
            inset signal ring and a stronger glow fade in on group-hover. */}
        <div
          data-testid="venue-feature-card-hover"
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-[14px] opacity-0 transition-opacity duration-[var(--motion-base)] ease-[var(--motion-ease)] group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{
            background: 'color-mix(in oklab, var(--signal) 6%, transparent)',
            boxShadow:
              'inset 0 0 0 1px color-mix(in oklab, var(--signal) 55%, transparent), inset 0 0 32px -8px color-mix(in oklab, var(--accent) 35%, transparent)',
          }}
        />
        {/* Left — identity art panel */}
        <div
          className="relative"
          style={{ height: 240, background: identity.palette.bg }}
        >
          {glyphKey !== null ? (
            <VenueNeonArt glyphKey={glyphKey} glyphSize={150} />
          ) : (
            <IdentityArt
              name={venue.name}
              kind="venue"
              scale="hero"
              grain={0.1}
              style={{ width: '100%', height: '100%' }}
              templateOverride="stripes"
            />
          )}
          {/* Flagship eyebrow */}
          <div
            style={{
              position: 'absolute',
              left: 14,
              top: 14,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(6px)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: FLAGSHIP_CHIP_COLOR,
            }}
            data-testid="flagship-chip"
          >
            {VENUES_INDEX_COPY.featureCard.flagship}
          </div>
          {/* Monogram chip, drawn here rather than by IdentityArt: #1525
              retired the chip internal to IdentityArt. Venue surfaces keep
              their own overlay — venue imagery is a separate handoff. The
              neon glyph art names the venue itself, so it takes no chip. */}
          {glyphKey === null && (
            <div
              style={{
                position: 'absolute',
                left: 14,
                bottom: 14,
                padding: '8px 12px',
                borderRadius: 8,
                background: dark
                  ? 'rgba(0,0,0,0.55)'
                  : 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(6px)',
                fontFamily: 'var(--font-ui)',
                fontWeight: 900,
                fontSize: 24,
                letterSpacing: '0.02em',
                color: dark ? '#F1E6D5' : '#191418',
                lineHeight: 1,
              }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Right — meta column */}
        <div className="relative flex flex-col justify-between py-6 px-7">
          {/* Chevron — top-right, lights up signal on card hover */}
          <div
            className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center border transition-all group-hover:bg-[var(--signal)] group-hover:border-[var(--signal)] group-hover:text-[var(--fg-on-accent)]"
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border-strong)',
              color: 'var(--fg-muted)',
            }}
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M5 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div style={{ paddingRight: 52 }}>
            {/* Type chip */}
            {venue.venueType && (
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-strong)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  color: 'var(--fg-muted)',
                }}
              >
                {venue.venueType}
              </span>
            )}
            <div
              className="mt-2.5 line-clamp-2 text-[34px] font-extrabold text-fg leading-[1.05]"
              style={{ letterSpacing: '-0.03em' }}
            >
              <VenueName name={venue.name} />
            </div>
            <div
              className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--fg-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              <span>
                {[venue.neighborhood, venue.city].filter(Boolean).join(' · ')}
              </span>
              <span
                className="flex items-center gap-1 whitespace-nowrap"
                style={{ color: 'var(--signal)', textTransform: 'none' }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6h7M6 3l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {VENUES_INDEX_COPY.featureCard.directions}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div
            className="flex gap-10 items-end"
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: '1px solid var(--border)',
            }}
          >
            {[
              {
                label: VENUES_INDEX_COPY.statLabels.capacity,
                value: venue.capacity ? fmtNum(venue.capacity) : '—',
                signal: false,
              },
              {
                label: VENUES_INDEX_COPY.statLabels.upcoming,
                value: String(venue.upcomingCount),
                signal: true,
              },
              {
                label: VENUES_INDEX_COPY.statLabels.distance,
                value: fmtDistance(venue.distanceMi),
                signal: false,
              },
            ].map(({ label, value, signal }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--fg-subtle)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    color: signal ? 'var(--signal)' : 'var(--fg)',
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile — vertical card */}
      <div
        data-testid="venue-feature-card-mobile"
        className="lg:hidden rounded-[14px] overflow-hidden"
        style={FLAGSHIP_EDGE}
      >
        <div
          className="relative"
          style={{ height: 180, background: identity.palette.bg }}
        >
          {glyphKey !== null ? (
            <VenueNeonArt glyphKey={glyphKey} glyphSize={120} align="end" />
          ) : (
            <IdentityArt
              name={venue.name}
              kind="venue"
              scale="hero"
              grain={0.1}
              style={{ width: '100%', height: '100%' }}
              templateOverride="stripes"
            />
          )}
          <div
            style={{
              position: 'absolute',
              left: 12,
              top: 12,
              padding: '3px 9px',
              borderRadius: 999,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(6px)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: FLAGSHIP_CHIP_COLOR,
            }}
            data-testid="flagship-chip"
          >
            {VENUES_INDEX_COPY.featureCard.flagship}
          </div>
          {glyphKey === null && (
            <div
              style={{
                position: 'absolute',
                left: 12,
                bottom: 12,
                padding: '6px 10px',
                borderRadius: 7,
                background: dark
                  ? 'rgba(0,0,0,0.55)'
                  : 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(6px)',
                fontFamily: 'var(--font-ui)',
                fontWeight: 900,
                fontSize: 18,
                letterSpacing: '0.02em',
                color: dark ? '#F1E6D5' : '#191418',
                lineHeight: 1,
              }}
            >
              {initials}
            </div>
          )}
        </div>
        <div className="p-4 pb-4.5">
          <div
            className="text-2xl font-extrabold text-fg leading-[1.1]"
            style={{ letterSpacing: '-0.03em' }}
          >
            <VenueName name={venue.name} />
          </div>
          <div
            className="mt-1.5 flex items-center gap-3 flex-wrap"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--fg-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            <span>{venue.neighborhood ?? venue.city}</span>
            <span
              className="flex items-center gap-1"
              style={{ color: 'var(--signal)', textTransform: 'none' }}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 6h7M6 3l3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {VENUES_INDEX_COPY.featureCard.directions}
            </span>
          </div>
          <div
            className="mt-4 pt-3.5 flex gap-6"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            {[
              {
                label: VENUES_INDEX_COPY.statLabels.capacity,
                value: venue.capacity ? fmtNum(venue.capacity) : '—',
                signal: false,
              },
              {
                label: VENUES_INDEX_COPY.statLabels.upcoming,
                value: String(venue.upcomingCount),
                signal: true,
              },
              {
                label: VENUES_INDEX_COPY.statLabels.distance,
                value: fmtDistance(venue.distanceMi),
                signal: false,
              },
            ].map(({ label, value, signal }) => (
              <div key={label} className="flex flex-col gap-1">
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--fg-subtle)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    color: signal ? 'var(--signal)' : 'var(--fg)',
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
