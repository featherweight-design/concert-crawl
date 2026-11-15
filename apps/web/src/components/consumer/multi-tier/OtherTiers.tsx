'use client';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { Eyebrow } from '@/components/consumer/glyphs';
import {
  TierAlternateRow,
  type TierAlternateRowProps,
} from '@/components/consumer/multi-tier/TierAlternateRow';

const copy = CONSUMER_COPY.multiTier;

interface OtherTiersProps {
  alternates: TierAlternateRowProps[];
}

/**
 * The "Other tiers" list: the multi-tier live card's section, and the same
 * section inside the single-price check card when the headline tier is the one
 * under check (`20/tier-price-check`).
 */
export const OtherTiers = ({ alternates }: OtherTiersProps) => {
  if (alternates.length === 0) return null;
  return (
    <div style={{ marginTop: '12px' }}>
      <Eyebrow>{copy.otherTiersEyebrow}</Eyebrow>
      {alternates.map((alt, idx) => (
        <TierAlternateRow key={`${alt.tier}-${idx}`} {...alt} />
      ))}
    </div>
  );
};
