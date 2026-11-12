/**
 * The image ring (B+ rule 2): 1.25px in the genre's color plus a 20px glow in
 * the same color at 40%, as the boards draw it (`shelf-see-all-m`, row and
 * spotlight thumbnails: `0 0 0 1.25px <genre>, 0 0 20px rgba(<genre>,0.4)`).
 * One recipe for every surface that frames its artwork in the lead genre:
 * event rows, the Tonight spotlight, Concerts, the followed-artist rows and
 * search results. A box-shadow, so an `overflow-hidden` clip on the framed box
 * never cuts it.
 */
export const genreRing = (genre: string): string =>
  `0 0 0 1.25px ${genre}, 0 0 20px color-mix(in oklch, ${genre} 40%, transparent)`;
