// Customer-facing push/tray copy for #1064 watch-update fan-out. Templates
// lifted verbatim from the locked design mock
// (design/design_handoff_pwa_cluster/pwa-data.jsx → PUSH_COPY.notifications).
// Voice-passed. Centralized here so future audits or copy edits land in one
// place rather than being scattered across the switch statement.

export const watchNotificationCopy = {
  cancelled: (artistAtVenue: string) => ({
    title: `${artistAtVenue} — cancelled.`,
    body: "The show's off. Tap for refund details.",
  }),
  postponed: (artistAtVenue: string, dateLabel: string) => ({
    title: `${artistAtVenue} moved to ${dateLabel}.`,
    body: "Same tickets, new night. Can't make it? Refund info inside.",
  }),
  soldout: (artistAtVenue: string) => ({
    title: `${artistAtVenue} is sold out.`,
    body: "Official waitlist may open closer to the date — we'll watch it.",
  }),
  backonsale: (artistAtVenue: string) => ({
    title: `Tickets for ${artistAtVenue} just went back on sale.`,
    body: 'A batch reopened. They tend to go fast — no pressure though.',
  }),
  // Default price-drop template — fanoutWatchNotification uses this when
  // it receives a watch.pricedrop category. Price-drop writers that have
  // the actual price delta prefer to template at the write site so the
  // body can carry the concrete number; this is the fallback copy for
  // callers that don't.
  pricedrop: (artistAtVenue: string) => ({
    title: `Tickets for ${artistAtVenue} just dropped.`,
    body: 'Cheaper than we last saw. Grab them before they go.',
  }),
} as const
