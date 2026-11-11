/** A show on the private-beta landing's card fan and ticker. Never linked. */
export interface InviteShow {
  id: string;
  artist: string;
  venue: string;
  /** Today in Denver: the card reads "Tonight" and carries the pill. */
  tonight: boolean;
  /** `NOV 13`, used when the show is not tonight. */
  dateShort: string;
  /** `6pm`, or empty when the venue lists no time. */
  showTime: string;
  genre: string | null;
  imageUrl: string | null;
  artistPhotoUrl: string | null;
}

/** A crawled venue, for the icon row and the count. */
export interface InviteVenue {
  slug: string;
  name: string;
}
