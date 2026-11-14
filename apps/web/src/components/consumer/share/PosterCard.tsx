import React from 'react';
import { identityFor } from '@/components/consumer/identity-art/IdentityArt';
import { IdentityArtPrint } from '@/components/consumer/identity-art/IdentityArtPrint';
import {
  SC_METRICS,
  SC_RATIOS,
  SQUARE_DATE_STACK,
  frameArtSize,
  type ShareFrame,
  type ShareRatio,
} from '@/components/consumer/share/definitions/ratios';
import { ShareWordmark } from '@/components/consumer/share/ShareWordmark';
import {
  fitLine,
  metaMaxChars,
  NAME_ELLIPSIS,
  shareMetaLines,
  storyNameText,
  type FittedLine,
  type ShareCard,
  type ShareChip,
} from '@/lib/share/share-layout';

// ── Why this file looks the way it does ────────────────────────────
// Everything here renders inside satori, not a browser: any element with more
// than one child needs `display: 'flex'`, sizes are pixels, and colours are
// literals (no `var()`). The card is theme-independent, so it draws in the B+
// Electric palette whatever theme the sharer runs; the ground is sampled off
// the board. CSS `filter: blur()` does render here (satori hands it to resvg),
// which is what draws the blurred copy of the photo behind Square and Wide.

const GROUND = '#0c0d1f';
const FG = '#e8f3ff';
const MUTED = '#9aa8c7';
const SIGNAL = '#7ae6ff';
const ACCENT = '#ff7bd4';
const CHIP_FILL = '#131a37';
const CHIP_BORDER = '#1f2748';
const RULE = 'rgba(232,243,255,0.14)';
/** The darkening over the blurred copy, near side → far side (alpha). */
const BACKDROP_WASH: Record<'square' | 'link', [number, string][]> = {
  square: [
    [0.4, '0%'],
    [0.68, '40%'],
    [0.92, '75%'],
    [1, '100%'],
  ],
  // Wide's text column starts at 48%, so the glow is gone by then.
  link: [
    [0.2, '0%'],
    [0.55, '35%'],
    [0.95, '50%'],
    [1, '100%'],
  ],
};
/**
 * With no photo the ground is the art's flat palette colour, often pale, so it
 * is held well down: undrawn on the board, and the photo tuning above would
 * wash a cream ground to grey.
 */
const FLAT_GROUND_WASH: [number, string][] = [
  [0.72, '0%'],
  [0.9, '45%'],
  [1, '75%'],
];
/** Story's full-bleed photo: the top 56% of the card, as drawn. */
const STORY_PHOTO_HEIGHT = 1070;

const rgba = (hex: string, alpha: number): string => {
  const channel = (at: number) => Number.parseInt(hex.slice(at, at + 2), 16);
  return `rgba(${channel(1)},${channel(3)},${channel(5)},${alpha})`;
};

export interface PosterCardProps {
  card: ShareCard;
  ratio: ShareRatio;
  /** A data URI from `loadSharePhoto`, or null: IdentityArt draws instead. */
  photo: string | null;
  /**
   * Square and Wide with no photo: IdentityArt pre-rendered flat to a PNG
   * (`identityArtDataUri` at `frameArtSize`), because satori mis-rotates an
   * inline SVG on the tilted card. Null falls back to the inline art.
   */
  frameArt?: string | null;
}

/** The date block and countdown: the boards' heavier mono. */
const MONO = { fontFamily: 'JetBrains Mono', fontWeight: 700 } as const;
/** The genre chip and meta lines: the boards' lighter mono. */
const MONO_LIGHT = { fontFamily: 'JetBrains Mono', fontWeight: 400 } as const;

/** Photo or IdentityArt, filling a fixed box. */
const Art = ({
  artist,
  photo,
  width,
  height,
}: {
  artist: string;
  photo: string | null;
  width: number;
  height: number;
}) =>
  photo !== null ? (
    // eslint-disable-next-line @next/next/no-img-element -- satori draws a plain <img>; next/image is a browser component
    <img
      alt=""
      src={photo}
      width={width}
      height={height}
      style={{ width, height, objectFit: 'cover' }}
    />
  ) : (
    <IdentityArtPrint
      name={artist}
      kind="artist"
      width={width}
      height={height}
    />
  );

/**
 * Square and Wide: a blurred, darkened copy of the photo behind the tilted
 * card ("so there is no new crop"). With no photo, the art's own ground.
 */
const Backdrop = ({
  card,
  photo,
  ratio,
}: {
  card: ShareCard;
  photo: string | null;
  ratio: ShareRatio;
}) => {
  const { width, height } = SC_RATIOS[ratio];
  // Sized off the longer side and centred, so Wide's glow sits beside its
  // card rather than showing only the photo's top band.
  const bleed = Math.round(width * 0.12);
  const side = width + bleed * 2;
  const angle = ratio === 'link' ? 90 : 135;
  return (
    <div
      style={{
        display: 'flex',
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
      }}
    >
      {photo !== null ? (
        // eslint-disable-next-line @next/next/no-img-element -- satori draws a plain <img>; next/image is a browser component
        <img
          alt=""
          src={photo}
          width={side}
          height={side}
          style={{
            position: 'absolute',
            left: -bleed,
            top: Math.round((height - side) / 2),
            width: side,
            height: side,
            objectFit: 'cover',
            filter: 'blur(60px)',
          }}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            width,
            height,
            backgroundColor: identityFor(card.artist, 'artist').palette.bg,
          }}
        />
      )}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height,
          // Tuned to colours sampled off the board (more-r3-share_shapes):
          // the glow reads #3f3d40 beside Wide's card and #332c34 above
          // Square's, falling to the #0c0d1f ground on the far side.
          backgroundImage: `linear-gradient(${angle}deg, ${(photo === null
            ? FLAT_GROUND_WASH
            : BACKDROP_WASH[ratio === 'link' ? 'link' : 'square']
          )
            .map(([alpha, at]) => `${rgba(GROUND, alpha)} ${at}`)
            .join(', ')})`,
        }}
      />
    </div>
  );
};

const Frame = ({
  frame,
  card,
  photo,
}: {
  frame: ShareFrame;
  card: ShareCard;
  /** The photo, or the pre-rendered IdentityArt PNG (`frameArtSize`). */
  photo: string | null;
}) => {
  const inner = frameArtSize(frame);
  return (
    <div
      style={{
        display: 'flex',
        position: 'absolute',
        left: frame.cx - frame.size / 2,
        top: frame.cy - frame.size / 2,
        width: frame.size,
        height: frame.size,
        transform: `rotate(${frame.tilt}deg)`,
        border: `${frame.border}px solid ${SIGNAL}`,
        borderRadius: frame.radius,
        overflow: 'hidden',
        // The ring colour, so the antialiased seam inside it reads as ring.
        backgroundColor: SIGNAL,
        boxShadow: `0 ${frame.size * 0.05}px ${frame.size * 0.12}px rgba(0,0,0,0.55)`,
      }}
    >
      <Art artist={card.artist} photo={photo} width={inner} height={inner} />
    </div>
  );
};

const Chip = ({ chip, ratio }: { chip: ShareChip; ratio: ShareRatio }) => {
  const { font, height, padX, dot } = SC_METRICS[ratio].chip;
  return (
    <div
      style={{
        ...MONO_LIGHT,
        display: 'flex',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: Math.round(padX * 0.7),
        height,
        padding: `0 ${padX}px`,
        borderRadius: Math.round(height * 0.24),
        border: `2px solid ${CHIP_BORDER}`,
        backgroundColor: CHIP_FILL,
        fontSize: font,
        letterSpacing: '0.08em',
        color: MUTED,
      }}
    >
      <div
        style={{
          display: 'flex',
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: chip.dot,
          ...(chip.glow && {
            boxShadow: `0 0 ${dot * 0.85}px ${rgba(chip.dot, 0.6)}`,
          }),
        }}
      />
      {chip.label}
    </div>
  );
};

/** Square's top-right date block: FRI / 13 / NOV. */
const DateBlock = ({ card }: { card: ShareCard }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      position: 'absolute',
      top: SQUARE_DATE_STACK.top,
      right: SQUARE_DATE_STACK.right,
    }}
  >
    <div
      style={{
        ...MONO,
        display: 'flex',
        fontSize: SQUARE_DATE_STACK.label,
        letterSpacing: '0.12em',
        color: SIGNAL,
      }}
    >
      {card.date.weekday}
    </div>
    <div
      style={{
        display: 'flex',
        fontFamily: 'Inter',
        fontWeight: 900,
        fontSize: SQUARE_DATE_STACK.day,
        lineHeight: 1,
        letterSpacing: '-0.03em',
        color: FG,
        marginTop: SQUARE_DATE_STACK.dayGap,
      }}
    >
      {card.date.day}
    </div>
    <div
      style={{
        ...MONO,
        display: 'flex',
        fontSize: SQUARE_DATE_STACK.label,
        letterSpacing: '0.12em',
        color: FG,
        marginTop: SQUARE_DATE_STACK.monthGap,
      }}
    >
      {card.date.month}
    </div>
  </div>
);

const oneLine = {
  display: 'block',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;

/**
 * The B+ share card (more-r3-share_shapes): Story is a full-bleed photo over
 * the text block; Square and Wide put the photo on a tilted card over its own
 * blurred copy. No price, state, tagline, handle or stamp: none is drawn.
 */
export const PosterCard = ({
  card,
  ratio,
  photo,
  frameArt = null,
}: PosterCardProps) => {
  const { width, height } = SC_RATIOS[ratio];
  const metrics = SC_METRICS[ratio];
  const textWidth = width - metrics.textLeft - metrics.textRight;
  const [chipGap, nameGap, metaGap, ruleGap] = metrics.gaps;
  const name: FittedLine =
    ratio === 'story'
      ? {
          size: metrics.name,
          text: storyNameText(card.artist, metrics.name, textWidth),
          cut: false,
        }
      : fitLine(card.artist, metrics.name, textWidth, metrics.nameFloor);
  const nameSize = name.size;
  const metaLines = shareMetaLines(
    card,
    ratio,
    metaMaxChars(textWidth, metrics.meta),
  );

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        backgroundColor: GROUND,
      }}
    >
      {metrics.frame === null ? (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
            width,
            height: STORY_PHOTO_HEIGHT,
          }}
        >
          <Art
            artist={card.artist}
            photo={photo}
            width={width}
            height={STORY_PHOTO_HEIGHT}
          />
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: 0,
              left: 0,
              width,
              height: STORY_PHOTO_HEIGHT,
              backgroundImage: `linear-gradient(180deg, ${rgba(GROUND, 0)} 0%, ${rgba(GROUND, 0)} 55%, ${rgba(GROUND, 0.72)} 82%, ${GROUND} 100%)`,
            }}
          />
        </div>
      ) : (
        <>
          <Backdrop card={card} photo={photo} ratio={ratio} />
          <Frame frame={metrics.frame} card={card} photo={photo ?? frameArt} />
        </>
      )}

      {ratio === 'square' && <DateBlock card={card} />}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: metrics.textLeft,
          width: textWidth,
          ...(metrics.textBottom === null
            ? { top: 0, height, justifyContent: 'center' }
            : { bottom: metrics.textBottom }),
        }}
      >
        {card.chip !== null && <Chip chip={card.chip} ratio={ratio} />}
        <div
          style={{
            fontFamily: 'Inter',
            fontWeight: 900,
            fontSize: nameSize,
            letterSpacing: '-0.03em',
            color: FG,
            marginTop: card.chip !== null ? chipGap : 0,
            ...(ratio === 'story'
              ? {
                  display: 'block',
                  lineHeight: 0.92,
                  lineClamp: 2,
                  wordBreak: 'break-word',
                }
              : { display: 'flex', whiteSpace: 'nowrap', lineHeight: 1 }),
          }}
        >
          {/* A cut name ends in one U+2026 glyph, untracked: the name's
              negative tracking otherwise spaces its dots apart. */}
          {name.cut ? (
            <>
              <span>{name.text}</span>
              <span style={{ letterSpacing: 0 }}>{NAME_ELLIPSIS}</span>
            </>
          ) : (
            name.text
          )}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: nameGap,
          }}
        >
          {metaLines.map((line) => (
            <div
              key={line}
              style={{
                ...MONO_LIGHT,
                ...oneLine,
                fontSize: metrics.meta,
                lineHeight: 1.45,
                letterSpacing: '0.08em',
                color: MUTED,
              }}
            >
              {line}
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: metaGap,
            paddingTop: ruleGap,
            borderTop: `2px solid ${RULE}`,
          }}
        >
          <ShareWordmark size={metrics.wordmark} color={FG} accent={ACCENT} />
          {card.countdown !== null && (
            <div
              style={{
                ...MONO,
                display: 'flex',
                fontSize: metrics.countdown,
                letterSpacing: '0.12em',
                color: SIGNAL,
              }}
            >
              {card.countdown}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
