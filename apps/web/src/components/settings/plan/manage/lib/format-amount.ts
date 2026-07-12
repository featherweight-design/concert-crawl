// Proration cents → "$X.XX" for the switch-tier math cards. USD only —
// pricing is US-market ($2/$3/$5) and Stripe returns cents.

export const formatDollarsFromCents = (cents: number): string =>
  `$${(cents / 100).toFixed(2)}`
