// WCAG 2 contrast maths over six-digit hexes, shared by the pill ink
// (`going/lib/pill-ink.ts`) and the tokens `themes.ts` derives by contrast.
// It imports nothing, so `themes.ts` can use it without a cycle.

/** WCAG 2 AA for body-size text. */
export const AA_TEXT_CONTRAST = 4.5;

const channel = (srgb: number): number => {
  const unit = srgb / 255;
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance of a six-digit hex, or null for anything else. */
export const relativeLuminance = (hex: string): number | null => {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) return null;
  const num = parseInt(match[1], 16);
  return (
    0.2126 * channel((num >> 16) & 255) +
    0.7152 * channel((num >> 8) & 255) +
    0.0722 * channel(num & 255)
  );
};

/** WCAG contrast ratio between two six-digit hexes, or null if either is not one. */
export const contrastRatio = (one: string, two: string): number | null => {
  const lumOne = relativeLuminance(one);
  const lumTwo = relativeLuminance(two);
  if (lumOne === null || lumTwo === null) return null;
  return (Math.max(lumOne, lumTwo) + 0.05) / (Math.min(lumOne, lumTwo) + 0.05);
};

/**
 * The first of `inks` that reaches AA on `ground`, in order of preference.
 * When none does, the one with the highest ratio; when none is a hex (or the
 * ground is not), the first, as drawn.
 */
export const firstReadableInk = (
  ground: string,
  inks: readonly [string, ...string[]],
): string => {
  let best = inks[0];
  let bestRatio = -1;
  for (const ink of inks) {
    const ratio = contrastRatio(ink, ground);
    if (ratio === null) continue;
    if (ratio >= AA_TEXT_CONTRAST) return ink;
    if (ratio > bestRatio) {
      best = ink;
      bestRatio = ratio;
    }
  }
  return best;
};
