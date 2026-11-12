// The artist page's hero (B+ B10, `09-artist`), built like the event page's
// stage: the portrait blurred and washed in the THEME's two colors as the
// backdrop, the portrait card tilted over it wearing the lead GENRE's ring, and
// the title column under the card on mobile and beside it on desktop. Desktop
// adds the starburst behind the card at 8%; mobile has none, as drawn.
//
// The wash, halftone and ring recipes match B8's `event-stage` deliberately.
// They live here rather than in a shared module because B8 is not on main yet
// and PRs never stack; once both have merged, the two stages fold into one.

import type { CSSProperties, ReactNode } from 'react';

import { EventImage } from '@/components/consumer/event-image';
import { Panel } from '@/components/consumer/image-slot';
import { NEUTRAL_GENRE_COLOR } from '@/lib/genre-color';

/** The card's tilt, in degrees. Never animated: the card simply sits askew. */
export const ARTIST_CARD_TILT = -2;
export const ARTIST_CARD_RADIUS = 16;

// Each theme's own pair mixed into the theme's ground, so the wash stays light
// on Light and dark on the dark themes and --fg reads over it on every theme.
const THEME_WASH =
  'linear-gradient(110deg, color-mix(in oklch, var(--signal) 46%, var(--bg)) 0%, color-mix(in oklch, var(--accent) 46%, var(--bg)) 100%)';
// Drawn in the ground color, so it darkens a dark wash and lightens a light one.
const HALFTONE =
  'radial-gradient(circle, color-mix(in oklch, var(--bg) 60%, transparent) 1.1px, transparent 1.6px)';
// The stage lands on the page's own ground, so the content below starts on flat
// --bg with no seam.
const GROUND_FADE =
  'linear-gradient(to bottom, transparent 38%, color-mix(in oklch, var(--bg) 72%, transparent) 76%, var(--bg) 100%)';
// README: "a starburst sits behind the photo at 8% opacity", desktop only.
export const STARBURST_OPACITY = 0.08;
const starburst = (ring: string) =>
  `repeating-conic-gradient(from 0deg at 50% 50%, ${ring} 0deg 4deg, transparent 4deg 12deg)`;
// A mask reads only alpha, so `black` here means "opaque", not a color.
const STARBURST_MASK =
  'radial-gradient(circle at 50% 50%, black 0%, black 30%, transparent 70%)';

/**
 * The genre ring on the card: 1.25px in the genre's color plus its glow.
 *
 * An ungenred artist (the `NEUTRAL_GENRE_COLOR` fallback) keeps the 1.25px
 * ring and drops the glow and the shadow, as `stageRing`, `genreRing` and
 * `GenreDot` do (addendum-2 item 23: "a neutral ring and no glow"). The
 * loading skeleton frames itself in the neutral color, so it follows too.
 */
export const artistRing = (ring: string): string =>
  ring === NEUTRAL_GENRE_COLOR
    ? `0 0 0 1.25px ${ring}`
    : `0 0 0 1.25px ${ring}, 0 0 24px color-mix(in oklch, ${ring} 40%, transparent), 0 18px 36px -20px var(--shadow-strong)`;

/**
 * The card's shape: it fills its slot (200px wide on mobile) at 4:5, so 200 ×
 * 250 there. Shared with the loading skeleton (addendum 3), which must land
 * exactly where the loaded card does.
 */
export const ARTIST_CARD_RATIO = '4 / 5';

/** The card's frame: radius, tilt and ring. The skeleton wears the same. */
export const artistCardFrame = (ring: string): CSSProperties => ({
  borderRadius: ARTIST_CARD_RADIUS,
  transform: `rotate(${ARTIST_CARD_TILT}deg)`,
  boxShadow: artistRing(ring),
});

/**
 * The washed backdrop. Decorative: everything it shows is the card in front of
 * it. Without a portrait it blurs the generated mark, which the wash turns into
 * the same theme field. The loading skeleton passes no art and gets the wash.
 */
export const ArtistBackdrop = ({
  art,
}: {
  art?: { name: string; photoUrl: string | null };
}) => (
  <div
    aria-hidden
    data-testid="stage-backdrop"
    className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
  >
    {art && (
      <div
        className="absolute -inset-[14%]"
        style={{ filter: 'blur(26px) saturate(1.15)', opacity: 0.85 }}
      >
        {/* Portrait or generated art only: an artist surface never borrows a
            show poster (imagery §2.3). */}
        <EventImage
          src={art.photoUrl}
          alt=""
          artist={art.name}
          identityScale="hero"
          className="h-full w-full"
        />
      </div>
    )}
    <div
      className="absolute inset-0"
      style={{ background: THEME_WASH, opacity: art ? 0.8 : 0.35 }}
    />
    {art && (
      <div
        className="absolute inset-0"
        style={{ backgroundImage: HALFTONE, backgroundSize: '9px 9px' }}
      />
    )}
    <div className="absolute inset-0" style={{ background: GROUND_FADE }} />
  </div>
);

export type ArtistStageShellProps = {
  backdrop: ReactNode;
  /** The tilted card, already sized to fill its slot. */
  card: ReactNode;
  /** The genre color the starburst is drawn in; null draws none. */
  burst?: string | null;
  /** The title column. */
  children: ReactNode;
  back?: ReactNode;
  /** The top-right control, the back chip's mirror: Share. */
  actions?: ReactNode;
  /** Desktop only: the follow block on the stage's right. */
  aside?: ReactNode;
};

/**
 * The geometry, shared with the route's loading skeleton so the page holds its
 * shape when the data lands (README rule 9).
 */
export const ArtistStageShell = ({
  backdrop,
  card,
  burst = null,
  children,
  back,
  actions,
  aside,
}: ArtistStageShellProps) => (
  <div
    data-testid="hero-band"
    className="relative isolate overflow-hidden px-4 pb-6 pt-4 md:px-8 md:pb-11 md:pt-[84px]"
  >
    {backdrop}
    {back && (
      <div className="absolute left-4 top-3 z-[3] md:left-8 md:top-6">
        {back}
      </div>
    )}
    {actions && (
      <div className="absolute right-4 top-3 z-[3] md:right-8 md:top-6">
        {actions}
      </div>
    )}
    <div className="relative mx-auto flex max-w-[1040px] flex-col items-center md:flex-row md:items-center md:gap-9">
      <div className="relative mt-8 w-[200px] shrink-0 md:mt-0 md:w-[244px]">
        {burst && (
          <div
            aria-hidden
            data-testid="stage-starburst"
            className="pointer-events-none absolute left-1/2 top-1/2 -z-[1] hidden h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 md:block"
            style={{
              background: starburst(burst),
              opacity: STARBURST_OPACITY,
              maskImage: STARBURST_MASK,
              WebkitMaskImage: STARBURST_MASK,
            }}
          />
        )}
        {card}
      </div>
      <div
        data-testid="stage-column"
        className="mt-6 flex w-full min-w-0 flex-col items-center text-center md:mt-0 md:w-auto md:flex-1 md:items-start md:text-left"
      >
        {children}
      </div>
      {aside && (
        <div className="hidden w-[220px] shrink-0 text-center md:block">
          {aside}
        </div>
      )}
    </div>
  </div>
);

export type ArtistStageProps = {
  name: string;
  photoUrl: string | null;
  /** The lead genre's color, or the neutral ring for an ungenred artist. */
  ring: string;
  children: ReactNode;
  back?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
};

export const ArtistStage = ({
  name,
  photoUrl,
  ring,
  children,
  back,
  actions,
  aside,
}: ArtistStageProps) => (
  <ArtistStageShell
    backdrop={<ArtistBackdrop art={{ name, photoUrl }} />}
    burst={ring}
    back={back}
    actions={actions}
    aside={aside}
    card={
      <div data-testid="stage-card" style={artistCardFrame(ring)}>
        <Panel
          surface="artist"
          photoUrl={photoUrl}
          name={name}
          size="100%"
          ratio={ARTIST_CARD_RATIO}
          radius={ARTIST_CARD_RADIUS}
          scale="hero"
        />
      </div>
    }
  >
    {children}
  </ArtistStageShell>
);
