'use client';

import { useId } from 'react';
import type { AvatarColor } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { AvatarRing } from './AvatarRing';
import { AVATAR_COLORS, AVATAR_PAIRS } from './definitions/constants';
import { avatarPair } from './definitions/styles';

const SETTINGS_COPY = CONSUMER_COPY.settings;
const COLOR_NAME = SETTINGS_COPY.avatarColorNames;

/** The preview's ring, and the faint hairline ring drawn around it. */
const PREVIEW_PX = 100;
const PREVIEW_HAIRLINE_PX = 114;
const PAIR_SWATCH_PX = 42;
/** Room for the selected swatch's ring: 3px gap plus 2px line, each side. */
const PAIR_RING_ROOM_PX = 10;
const SOLID_SWATCH_PX = 28;

const EYEBROW: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  fontWeight: 500,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--fg-subtle)',
};

interface AvatarPickerProps {
  handle: string | null;
  avatarColor: AvatarColor | null;
  avatarSecondColor: AvatarColor | null;
  /** The second colour is null for a solid avatar, which the API stores as such. */
  onChange: (first: AvatarColor, second: AvatarColor | null) => void;
}

/**
 * Edit profile's avatar picker (B+ more-s-e_mix, more-s-edit_d): a framed card
 * holding a centred ring preview, six conic Mix two pair swatches, and a row
 * of four solid colours.
 */
export function AvatarPicker({
  handle,
  avatarColor,
  avatarSecondColor,
  onChange,
}: AvatarPickerProps) {
  const mixId = useId();
  const solidId = useId();
  // A profile with no colour yet draws the house pair, so that pair is the
  // selected swatch, as the board has it.
  const resolved = avatarPair(avatarColor, avatarSecondColor);
  const isPair = resolved.first !== resolved.second;
  // The ring and initial are drawn the same either way round, so a stored
  // (accent, signal) selects the (signal, accent) swatch.
  const isSelectedPair = (first: AvatarColor, second: AvatarColor) =>
    isPair &&
    ((resolved.first === first && resolved.second === second) ||
      (resolved.first === second && resolved.second === first));

  return (
    <div
      data-testid="avatar-picker"
      className="flex flex-col gap-3 rounded-2xl border border-border"
      style={{ background: 'var(--surface-1)', padding: '14px 12px 20px' }}
    >
      <div className="flex justify-center">
        <div
          data-testid="avatar-picker-preview"
          className="flex items-center justify-center rounded-full"
          style={{
            width: PREVIEW_HAIRLINE_PX,
            height: PREVIEW_HAIRLINE_PX,
            border: '1px solid var(--border-strong)',
          }}
        >
          <AvatarRing
            handle={handle}
            avatarColor={avatarColor}
            avatarSecondColor={avatarSecondColor}
            size={PREVIEW_PX}
            washBoth
          />
        </div>
      </div>

      <div
        role="group"
        aria-labelledby={mixId}
        className="flex flex-col gap-2.5 pt-3"
      >
        <span id={mixId} style={{ ...EYEBROW, paddingLeft: 5 }}>
          {SETTINGS_COPY.avatarMixTwoEyebrow}
        </span>
        <div className="flex items-center justify-between">
          {AVATAR_PAIRS.map(([first, second]) => {
            const isSelected = isSelectedPair(first, second);
            return (
              // Each swatch's box caps at the board's size and shrinks with
              // the card, so six still fit at 320px.
              <span
                key={`${first}-${second}`}
                className="flex min-w-0 flex-1 items-center justify-center"
                style={{ maxWidth: PAIR_SWATCH_PX + PAIR_RING_ROOM_PX }}
              >
                <button
                  type="button"
                  onClick={() => onChange(first, second)}
                  aria-label={SETTINGS_COPY.avatarPairSwatchAriaLabel(
                    COLOR_NAME[first],
                    COLOR_NAME[second],
                  )}
                  aria-pressed={isSelected}
                  className="cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                  style={{
                    width: PAIR_SWATCH_PX,
                    maxWidth: `calc(100% - ${PAIR_RING_ROOM_PX}px)`,
                    aspectRatio: '1 / 1',
                    background: `conic-gradient(var(--${first}), var(--${second}), var(--${first}))`,
                    outline: isSelected ? '2px solid var(--fg)' : 'none',
                    outlineOffset: 3,
                  }}
                />
              </span>
            );
          })}
        </div>
      </div>

      <div
        role="group"
        aria-labelledby={solidId}
        className="flex flex-wrap items-center"
        style={{ columnGap: 12, rowGap: 8, paddingLeft: 5, marginTop: -4 }}
      >
        <span id={solidId} style={EYEBROW}>
          {SETTINGS_COPY.avatarSolidEyebrow}
        </span>
        <div className="flex items-center" style={{ gap: 8 }}>
          {AVATAR_COLORS.map((color) => {
            const isSelected = !isPair && resolved.first === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => onChange(color, null)}
                aria-label={SETTINGS_COPY.avatarColorSwatchAriaLabel(
                  COLOR_NAME[color],
                )}
                aria-pressed={isSelected}
                className="cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                style={{
                  width: SOLID_SWATCH_PX,
                  height: SOLID_SWATCH_PX,
                  background: `var(--${color})`,
                  outline: isSelected ? '2px solid var(--fg)' : 'none',
                  outlineOffset: 3,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
