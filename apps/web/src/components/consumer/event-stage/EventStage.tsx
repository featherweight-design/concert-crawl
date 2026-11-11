// The event page's hero (B+ B8, README rule 6, theme option A): the photo
// blurred and washed in the THEME's two colors as the page backdrop, the
// artist card tilted over it wearing the GENRE ring, and the title column
// under the card on mobile and beside it from `sm` up. The theme reads on the
// page while the genre reads the same as on every row and card.
//
// It replaces `HeroBand` on the two event surfaces only. The artist page keeps
// the band until its own restyle, so this is a sibling rather than a rewrite.

import type { ReactNode } from 'react';
import { EventImage } from '@/components/consumer/event-image';
import { Panel } from '@/components/consumer/image-slot';
import type { SlotSource } from '@/components/consumer/image-slot';
import { slotSources } from '@/components/consumer/image-slot/lib/slot-metrics';
import { genreColor, NEUTRAL_GENRE_COLOR } from '@/lib/genre-color';

type EventSlotSource = Extract<SlotSource, { surface: 'event' }>;

/** The card's tilt, in degrees. Never animated: the card simply sits askew. */
export const STAGE_CARD_TILT = -2;
export const STAGE_CARD_RADIUS = 16;

// Each theme's own pair, mixed into the theme's ground so the wash stays light
// on Light and dark on the dark themes, which is what keeps --fg readable over
// it on every theme without a per-theme rule.
export const THEME_WASH =
  'linear-gradient(110deg, color-mix(in oklch, var(--signal) 46%, var(--bg)) 0%, color-mix(in oklch, var(--accent) 46%, var(--bg)) 100%)';
// The halftone. Drawn in the ground color, so it darkens a dark wash and
// lightens a light one.
const HALFTONE =
  'radial-gradient(circle, color-mix(in oklch, var(--bg) 60%, transparent) 1.1px, transparent 1.6px)';
// The band lands on the page's own ground, so the content below it starts on
// flat --bg with no seam.
const GROUND_FADE =
  'linear-gradient(to bottom, transparent 38%, color-mix(in oklch, var(--bg) 72%, transparent) 76%, var(--bg) 100%)';
// Mobile only: rays fanning out from behind the countdown, as drawn.
const RAYS =
  'repeating-conic-gradient(from 0deg at 50% 66%, color-mix(in oklch, var(--accent) 13%, transparent) 0deg 3deg, transparent 3deg 11deg)';
const RAYS_MASK =
  'linear-gradient(to bottom, transparent 56%, #000 70%, #000 86%, transparent 100%)';

/**
 * The washed backdrop. Decorative: everything it shows is the card beside it.
 * With no photograph it blurs the generated mark instead, which the wash turns
 * into the same theme field.
 */
export const StageBackdrop = ({
  art,
}: {
  /** Absent on the loading skeleton, which draws the wash alone. */
  art?: { name: string } & EventSlotSource;
}) => {
  const hasSource = art !== undefined;
  const { primary, secondary } = art
    ? slotSources(art)
    : { primary: null, secondary: null };

  return (
    <div
      aria-hidden
      data-testid="stage-backdrop"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {hasSource && (
        <div
          className="absolute -inset-[14%]"
          style={{ filter: 'blur(26px) saturate(1.15)', opacity: 0.85 }}
        >
          <EventImage
            src={primary}
            artistPhotoUrl={secondary}
            alt=""
            artist={art?.name ?? ''}
            identityScale="hero"
            className="h-full w-full"
          />
        </div>
      )}
      <div
        className="absolute inset-0"
        style={{ background: THEME_WASH, opacity: hasSource ? 0.8 : 0.35 }}
      />
      {hasSource && (
        <>
          <div
            className="absolute inset-0"
            style={{ backgroundImage: HALFTONE, backgroundSize: '9px 9px' }}
          />
          <div
            className="absolute inset-0 sm:hidden"
            style={{
              background: RAYS,
              maskImage: RAYS_MASK,
              WebkitMaskImage: RAYS_MASK,
            }}
          />
        </>
      )}
      <div className="absolute inset-0" style={{ background: GROUND_FADE }} />
    </div>
  );
};

/** The genre ring on a card: 1.25px in the genre's color plus its glow. */
export const stageRing = (ring: string): string =>
  `0 0 0 1.25px ${ring}, 0 0 24px color-mix(in oklch, ${ring} 40%, transparent), 0 18px 36px -20px rgb(0 0 0 / 0.6)`;

export type StageShellProps = {
  backdrop: ReactNode;
  /** The tilted card, already sized to fill its slot. */
  card: ReactNode;
  /** The countdown pill, which overlaps the card's foot on mobile. */
  eyebrow?: ReactNode;
  /** The title column. */
  children: ReactNode;
  back?: ReactNode;
  actions?: ReactNode;
};

/**
 * The geometry, shared with the route's loading skeleton so the page holds its
 * shape when the data lands (README rule 9).
 */
export const StageShell = ({
  backdrop,
  card,
  eyebrow,
  children,
  back,
  actions,
}: StageShellProps) => (
  <div
    data-testid="hero-band"
    className="relative isolate overflow-hidden px-4 pb-7 pt-4 sm:px-8 sm:pb-11 sm:pt-[84px]"
  >
    {backdrop}
    {(back || actions) && (
      <div className="absolute inset-x-4 top-3 z-[3] flex items-center justify-between sm:inset-x-8 sm:top-6">
        <div className="flex gap-2">{back}</div>
        <div className="flex gap-2">{actions}</div>
      </div>
    )}
    <div className="relative mx-auto flex max-w-[900px] flex-col items-center sm:flex-row sm:items-center sm:gap-10">
      <div className="mt-5 w-[180px] shrink-0 sm:mt-0 sm:w-[244px]">{card}</div>
      {/* The headline steps at the breakpoint through one custom property,
            so the title block reads a single size token instead of knowing
            about breakpoints. */}
      <div
        data-testid="stage-column"
        className="mt-4 flex w-full min-w-0 flex-col items-center text-center [--stage-head:clamp(32px,10vw,44px)] sm:mt-0 sm:w-auto sm:flex-1 sm:items-start sm:text-left sm:[--stage-head:64px]"
      >
        {eyebrow && (
          <div className="relative z-[2] -mt-7 mb-4 sm:mt-0 sm:mb-3">
            {eyebrow}
          </div>
        )}
        {children}
      </div>
    </div>
  </div>
);

export const StageCountdown = ({ label }: { label: string }) => (
  <span
    data-testid="stage-countdown"
    className="inline-flex items-center gap-2 rounded-full font-mono uppercase text-fg"
    style={{
      padding: '5px 13px 5px 11px',
      fontSize: 11,
      letterSpacing: '0.22em',
      lineHeight: 1.2,
      border: '1px solid var(--border-strong)',
      background: 'color-mix(in oklch, var(--surface-1) 88%, transparent)',
    }}
  >
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{ width: 7, height: 7, background: 'var(--signal)' }}
    />
    {label}
  </span>
);

/** The date and venue line under the genre chips. */
export const StageMeta = ({ children }: { children: ReactNode }) => (
  <p
    data-testid="stage-meta"
    className="m-0 mt-3 font-mono uppercase text-fg-muted"
    style={{ fontSize: 11, letterSpacing: '0.16em', lineHeight: 1.5 }}
  >
    {children}
  </p>
);

export type EventStageProps = {
  /** The headliner: keys the generated art when no photograph resolves. */
  name: string;
  /** The lead genre, whose color rings the card. Null draws the neutral ring. */
  leadGenre: string | null;
  countdown: string | null;
  children: ReactNode;
  back?: ReactNode;
  actions?: ReactNode;
} & EventSlotSource;

export const EventStage = ({
  name,
  leadGenre,
  countdown,
  children,
  back,
  actions,
  ...source
}: EventStageProps) => {
  const ring = genreColor(leadGenre) ?? NEUTRAL_GENRE_COLOR;
  return (
    <StageShell
      backdrop={<StageBackdrop art={{ name, ...source }} />}
      back={back}
      actions={actions}
      eyebrow={countdown ? <StageCountdown label={countdown} /> : null}
      card={
        <div
          data-testid="stage-card"
          style={{
            borderRadius: STAGE_CARD_RADIUS,
            transform: `rotate(${STAGE_CARD_TILT}deg)`,
            boxShadow: stageRing(ring),
          }}
        >
          <Panel
            {...source}
            name={name}
            size="100%"
            ratio="4 / 5"
            radius={STAGE_CARD_RADIUS}
            scale="hero"
          />
        </div>
      }
    >
      {children}
    </StageShell>
  );
};
