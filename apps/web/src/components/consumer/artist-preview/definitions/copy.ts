// Copy for the artist preview: the sheet, palette drill-in and desktop card a
// tap on a MusicBrainz-only search row opens (addendum 13). Reviewed through
// copy-review. Locked vocabulary: Follow / Following for artists only.

export const ARTIST_PREVIEW_COPY = {
  // The plate's eyebrow, uppercased in CSS like the artist page's own.
  eyebrow: 'Artist',
  typeLabel: 'Type',
  fromLabel: 'From',
  // The one-line card. Bold lead, then what a follow is for. It does not
  // promise a notification: a follow delivers none (the page's honesty rail).
  notOnABillLead: 'Not on a Denver bill yet.',
  notOnABillRest: 'Follow to keep them on your list.',
  // Under the Follow, before and after. "Their page" is the page the follow
  // is about to create, so it reads in the future.
  pitch: 'Marks them as one of yours. Their dates will live on their page.',
  pitchFollowing: 'Their dates will live on their page.',
  // Shown once the follow has returned the new slug.
  openPage: 'Open their page',
  // The Close on the phone sheet and the desktop card (addendum 15, ruling 6).
  closeLabel: 'Close',
  // The palette footer while drilled in: Escape steps back, Enter follows and
  // then opens the page (addendum 15, ruling 4).
  footerBack: 'back to results',
  footerFollow: 'follow',
  footerOpenPage: 'open page',
  // Palette drill-in back row, `Results for “Clip”`.
  backToResults: (query: string) => `Results for “${query}”`,
} as const;
