import React from 'react';
import { identityFor } from '@/components/consumer/identity-art/IdentityArt';
import { IdentityArtPrint } from '@/components/consumer/identity-art/IdentityArtPrint';
import {
  SC_METRICS,
  SC_RATIOS,
  type ShareFrame,
  type ShareRatio,
} from '@/components/consumer/share/definitions/ratios';
import { ShareWordmark } from '@/components/consumer/share/ShareWordmark';
import {
  fitLineSize,
  shareMetaLines,
  storyNameText,
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
}

const MONO = { fontFamily: 'JetBrains Mono', fontWeight: 700 } as const;

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
  const bleed = Math.round(width * 0.12);
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
          width={width + bleed * 2}
          height={width + bleed * 2}
          style={{
            position: 'absolute',
            left: -bleed,
            top: -bleed,
            width: width + bleed * 2,
            height: width + bleed * 2,
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
          backgroundImage: `linear-gradient(${angle}deg, ${rgba(GROUND, 0.62)} 0%, ${rgba(GROUND, 0.9)} 45%, ${GROUND} 75%)`,
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
  photo: string | null;
}) => {
  const inner = frame.size - frame.border * 2;
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
        backgroundColor: GROUND,
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
        ...MONO,
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
      top: 98,
      right: 66,
    }}
  >
    <div
      style={{
        ...MONO,
        display: 'flex',
        fontSize: 34,
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
        fontSize: 126,
        lineHeight: 1,
        letterSpacing: '-0.03em',
        color: FG,
        marginTop: 6,
      }}
    >
      {card.date.day}
    </div>
    <div
      style={{
        ...MONO,
        display: 'flex',
        fontSize: 34,
        letterSpacing: '0.12em',
        color: FG,
        marginTop: 44,
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
export const PosterCard = ({ card, ratio, photo }: PosterCardProps) => {
  const { width, height } = SC_RATIOS[ratio];
  const metrics = SC_METRICS[ratio];
  const textWidth = width - metrics.textLeft - metrics.textRight;
  const [chipGap, nameGap, metaGap, ruleGap] = metrics.gaps;
  const nameSize =
    ratio === 'story'
      ? metrics.name
      : fitLineSize(card.artist, metrics.name, textWidth, metrics.nameFloor);

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
          <Frame frame={metrics.frame} card={card} photo={photo} />
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
              : { ...oneLine, lineHeight: 1 }),
          }}
        >
          {ratio === 'story'
            ? storyNameText(card.artist, nameSize, textWidth)
            : card.artist}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: nameGap,
          }}
        >
          {shareMetaLines(card, ratio).map((line) => (
            <div
              key={line}
              style={{
                ...MONO,
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
