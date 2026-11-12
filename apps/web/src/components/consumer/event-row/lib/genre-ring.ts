/**
 * The image ring: 1.25px in the genre's color plus a soft glow. One recipe for
 * every row that frames its artwork in the lead genre (event rows, Concerts,
 * the followed-artist rows). A box-shadow, so an `overflow-hidden` clip on the
 * framed box never cuts it.
 */
export const genreRing = (genre: string): string =>
  `0 0 0 1.25px ${genre}, 0 0 10px color-mix(in oklch, ${genre} 35%, transparent)`;
