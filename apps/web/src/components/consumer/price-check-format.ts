// How a price check is written on a card: the single-price check card and the
// per-tier check row (`20/tier-price-check`) read the same age and price text.

// The strip draws the age bare ("3h", more-st-disputes_board); the line under
// the headline keeps "ago".
export const formatAge = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
};

export const priceText = (floor: number, ceiling?: number | null): string =>
  ceiling != null
    ? `$${Math.round(floor)}–$${Math.round(ceiling)}`
    : `$${Math.round(floor)}`;
