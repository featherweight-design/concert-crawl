// Nobody followed yet.
//
// Both CTAs go somewhere known-static, which is why they are buttons rather
// than a chip rail: there is nothing to pick from until you have followed
// someone.
//
// B+ (`bp-s-empty_artists_m`): the My shows empty card. A dashed, centred card
// with three overlapping dashed rings, the location eyebrow, the gradient
// primary and the secondary as a text link. The eyebrow names the tab rather
// than restating the headline, which is what got the old one cut.

import Link from 'next/link';
import { SearchLink } from '@/components/consumer/search-palette/SearchLink';
import { MY_SHOWS_GRADIENT } from '@/components/consumer/history/definitions/constants';
import { MY_SHOWS_ARTISTS_COPY } from './definitions/copy';
import { BROWSE_HREF, WATCHING_HREF } from './definitions/constants';

const COPY = MY_SHOWS_ARTISTS_COPY.empty;

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal';

const primaryStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 44,
  padding: '12px 24px',
  borderRadius: 14,
  backgroundImage: MY_SHOWS_GRADIENT,
  color: 'var(--fg-on-accent)',
  fontFamily: 'var(--font-ui)',
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: '-0.01em',
  textDecoration: 'none',
  boxShadow: '0 8px 24px color-mix(in oklch, var(--signal) 22%, transparent)',
} as const;

const RING = 44;

const PeopleGlyph = () => (
  <svg
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="9" cy="8" r="3.2" />
    <circle cx="16.5" cy="9" r="2.6" />
    <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
    <path d="M14.5 14.4c2.6-.4 4.9 1.2 5.6 4.6" />
  </svg>
);

/** Three dashed rings, the middle one holding the people glyph. */
const Badge = () => (
  <span aria-hidden className="flex items-center">
    {[0, 1, 2].map((idx) => (
      <span
        key={idx}
        className="flex items-center justify-center rounded-full border border-dashed border-border-strong bg-surface-1"
        style={{
          width: RING,
          height: RING,
          marginLeft: idx === 0 ? 0 : -RING / 4,
          color: 'var(--fg-subtle)',
          position: 'relative',
          zIndex: idx === 1 ? 1 : 0,
        }}
      >
        {idx === 1 && <PeopleGlyph />}
      </span>
    ))}
  </span>
);

interface ArtistsEmptyProps {
  /** Signed in, plan cannot follow. Swaps the primary move for one that works. */
  locked: boolean;
  /** The desktop layout, which sits a little further down the page. */
  desktop?: boolean;
}

export const ArtistsEmpty = ({
  locked,
  desktop = false,
}: ArtistsEmptyProps) => (
  <div
    data-testid="artists-empty-card"
    className="flex flex-col items-center rounded-[18px] border border-dashed border-border-strong px-5 py-8 text-center sm:px-10 sm:py-10"
    style={{ marginTop: desktop ? 8 : 4 }}
  >
    <div className="mb-5">
      <Badge />
    </div>

    <p
      style={{
        margin: 0,
        fontFamily: 'var(--font-mono)',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--signal)',
      }}
    >
      {COPY.eyebrow}
    </p>

    <h2
      style={{
        margin: '10px 0 0',
        fontFamily: 'var(--font-ui)',
        fontSize: 'clamp(22px, 6.5vw, 30px)',
        fontWeight: 900,
        letterSpacing: '-0.03em',
        lineHeight: 1.1,
        color: 'var(--fg)',
      }}
    >
      {COPY.headline}
    </h2>

    <p
      style={{
        margin: '10px 0 0',
        maxWidth: 380,
        fontSize: 14,
        lineHeight: 1.55,
        color: 'var(--fg-muted)',
      }}
    >
      {COPY.body}
    </p>

    <div className="mt-5 flex flex-col items-center gap-3">
      {/* Locked sends them to browse, which is a page. Unlocked is a search,
          which is a palette. */}
      {locked ? (
        <Link href={BROWSE_HREF} className={FOCUS} style={primaryStyle}>
          {COPY.primaryLocked}
        </Link>
      ) : (
        <SearchLink className={FOCUS} style={primaryStyle}>
          {COPY.primary}
        </SearchLink>
      )}
      <Link
        href={WATCHING_HREF}
        className={`inline-flex min-h-[44px] items-center ${FOCUS}`}
        style={{
          color: 'var(--signal)',
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          textDecoration: 'none',
        }}
      >
        {COPY.secondary}
      </Link>
    </div>
  </div>
);
