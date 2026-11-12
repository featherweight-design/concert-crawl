'use client';

// The unsized sibling of `Panel`: art that takes whatever height the row has
// left rather than declaring one. It carries no `aspectRatio` on purpose — a
// ratio here re-opens the taste-pick overflow of #763 r4.

import { EventImage } from '../event-image';
import {
  FLEX_ART_MIN_HEIGHT,
  SLOT_HAIRLINE,
  SLOT_RADIUS,
} from './definitions/constants';
import type { SlotScale, SlotSource } from './definitions/types';
import { slotSources } from './lib/slot-metrics';

export type FlexArtProps = {
  name: string;
  alt?: string;
  minHeight?: number;
  radius?: number;
  /**
   * The identity mark's detail density. `tile` by default; a fill region that
   * renders at card height, like the browse shelf's, asks for `hero`.
   */
  scale?: SlotScale;
  className?: string;
} & SlotSource;

export const FlexArt = (props: FlexArtProps) => {
  const {
    name,
    alt = '',
    minHeight = FLEX_ART_MIN_HEIGHT,
    radius = SLOT_RADIUS.card,
    scale = 'tile',
    className,
  } = props;
  const { primary, secondary } = slotSources(props);

  return (
    <span
      className={className}
      {...(alt === '' && { 'aria-hidden': true })}
      style={{
        position: 'relative',
        display: 'block',
        flex: 1,
        minHeight,
        width: '100%',
        overflow: 'hidden',
        borderRadius: radius,
        boxShadow: SLOT_HAIRLINE,
      }}
    >
      {/* Absolutely positioned because `h-full` against a flex-sized parent
          resolves to auto, which would collapse the art to nothing. */}
      <span style={{ position: 'absolute', inset: 0 }}>
        <EventImage
          src={primary}
          artistPhotoUrl={secondary}
          alt={alt}
          artist={name}
          identityScale={scale}
          className="h-full w-full"
        />
      </span>
    </span>
  );
};
