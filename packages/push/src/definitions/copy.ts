// Customer-facing push/tray copy for #1064 watch-update fan-out. Templates
// lifted verbatim from the locked design mock
// (design/design_handoff_pwa_cluster/pwa-data.jsx → PUSH_COPY.notifications).
// Voice-passed. Centralized here so future audits or copy edits land in one
// place rather than being scattered across the switch statement.

export const watchNotificationCopy = {
  cancelled: (artistAtVenue: string) => ({
    title: `${artistAtVenue}: cancelled.`,
    // We never sell tickets, so we hold no refund record and the event page
    // has none either. The original body promised "tap for refund details"
    // against a page that cannot answer it; naming the seller is the honest
    // version of the same job.
    body: "The show's off. Contact your ticket vendor for refund details.",
  }),
  postponed: (artistAtVenue: string, dateLabel: string) => ({
    title: `${artistAtVenue} moved to ${dateLabel}.`,
    // The title already carries the new date, so the body's job is the thing
    // the title cannot say: the ticket still works.
    body: 'Same tickets, new night.',
  }),
  // Venue relocation. Deliberately NOT built from `artistAtVenue`: the
  // fan-out fires on the target event, whose venue is already the new one,
  // so that template would render "Artist at NewVenue moved to NewVenue".
  // Naming the room the watcher knew it under is also what identifies the
  // show for them.
  relocated: (artist: string, fromVenueName: string, newVenueName: string) => ({
    title: `${artist} at ${fromVenueName} moved.`,
    body: `Your ticket still works. New room: ${newVenueName}.`,
  }),
  soldout: (artistAtVenue: string) => ({
    title: `${artistAtVenue} is sold out.`,
    body: "Official waitlist may open closer to the date. We'll watch it.",
  }),
  backonsale: (artistAtVenue: string) => ({
    title: `Tickets for ${artistAtVenue} just went back on sale.`,
    body: 'A batch reopened. They tend to go fast, no pressure though.',
  }),
  // Price-drop template. When the caller passes concrete prices, the copy
  // matches the design handoff mock — title carries the new floor, body
  // names the previous number. When the caller can't supply prices (e.g.
  // a re-scrape detected the drop but only has the new value), fall back
  // to a generic template. Amounts are formatted whole-dollar per the
  // handoff (no cents).
  pricedrop: (
    artistAtVenue: string,
    prices?: { newPriceMin: string; oldPriceMin: string },
  ) => {
    if (!prices) {
      return {
        title: `Tickets for ${artistAtVenue} just dropped.`,
        body: 'Cheaper than we last saw. Grab them before they go.',
      }
    }
    const newPrice = formatWholeDollar(prices.newPriceMin)
    const oldPrice = formatWholeDollar(prices.oldPriceMin)
    return {
      title: `${newPrice} tickets for ${artistAtVenue} just went on sale.`,
      // Body copy lifted verbatim from the handoff mock
      // (design/design_handoff_pwa_cluster/pwa-data.jsx line 333). "Cheapest
      // we've seen for this one" reads against the event's stored prior
      // ticketPriceMin — which is the reference point for the drop we're
      // notifying about, so the claim is accurate for the flow that fires
      // this copy.
      body: `Down from ${oldPrice}. Cheapest we've seen for this one.`,
    }
  },
} as const

// Format a decimal ticketPrice ('32.00' | '32.5' | '32') as '$32'. The
// events.ticketPriceMin column is `numeric(10,2)` and comes back as a
// string; whole-dollar formatting matches the handoff mock and keeps the
// title compact enough for iOS's ~50-char alert width. Uses Math.floor
// rather than Math.round so we never overstate the ticket floor — a
// $32.50 minimum stays as "$32" instead of rounding UP to "$33" and
// misrepresenting the actual price on offer.
const formatWholeDollar = (raw: string): string => {
  const num = Number.parseFloat(raw)
  if (Number.isNaN(num)) return `$${raw}`
  return `$${Math.floor(num)}`
}
