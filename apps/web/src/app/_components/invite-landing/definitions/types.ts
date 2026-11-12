/** A show on the private-beta landing's card fan and ticker. Never linked. */
export interface InviteShow {
  id: string;
  artist: string;
  venue: string;
  /** Today in Denver: the card reads "Tonight" and carries the pill. */
  tonight: boolean;
  /** `NOV 13`, used when the show is not tonight. */
  dateShort: string;
  /** `6:00 PM` for the ticker, or empty when the venue lists no time. */
  showTime: string;
  /** `6 PM` (`6:30 PM` off the hour) for the card, or empty. */
  showTimeShort: string;
  genre: string | null;
  imageUrl: string | null;
  artistPhotoUrl: string | null;
}

/** A crawled venue, for the icon row and the count. */
export interface InviteVenue {
  slug: string;
  name: string;
}
