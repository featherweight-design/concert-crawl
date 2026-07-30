// Customer-facing strings for the landing poster stack.
export const LANDING_POSTER_COPY = {
  // Accessible name for a linked poster. The visual card is all art and
  // cropped type, so the name has to carry the whole offer on its own.
  showLinkLabel: (artist: string, venue: string, dateShort: string) =>
    `${artist} at ${venue}, ${dateShort}. See the show`,
  goToPoster: (position: number) => `Go to poster ${position}`,
} as const
