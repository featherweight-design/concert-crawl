// Every customer-facing string on the Share Concert Crawl sheet, from
// design/design_handoff_share_app/COPY.md. DRAFT strings go through the
// copy-review skill; the words that already ship in CONSUMER_COPY.share
// (Share…, Copy link, Link copied) are reused from there, not repeated here.
//
// The sharer is never named: no string here takes a name, and the invite code
// is data that never reaches copy.

export const SHARE_APP_COPY = {
  // The eyebrow over the title. The invite board (02, 03) draws the long form;
  // the after-launch board (04) draws the short one, which COPY.md does not
  // list.
  eyebrow: 'Share Concert Crawl',
  eyebrowOpen: 'Concert Crawl',

  // Before launch: the code is the invite.
  titleInvite: 'Bring your friends in',
  bodyInvite:
    'We’re invite-only for now. Anyone who scans your code skips the waitlist.',

  // After launch: a plain link to the site.
  titleOpen: 'Share Concert Crawl',
  bodyOpen:
    'Every Denver show in one calendar. Send it to someone you’d go with.',

  // The QR's accessible name.
  qrAria: 'QR code for your invite link',
  qrAriaOpen: 'QR code for concertcrawl.app',

  // The ticket's lower half.
  joinedLabel: 'Joined with your code',
  joinedNone: 'No one yet',
  joinedNoneSub: 'Your code doesn’t run out.',
  joinedOne: '1 friend',
  joinedCount: (count: number): string => `${count} friends`,
  // The chip after the fourth face.
  joinedMore: (count: number): string => `+${count}`,

  // Press states.
  shareFailed: 'Couldn’t share. Copy the link instead.',
  copyFailed: 'Couldn’t copy the link.',

  // The `text` handed to the system share sheet, with the link beside it.
  shareText:
    'Every Denver show in one calendar. Here’s my invite to Concert Crawl:',
  shareTextOpen: 'Every Denver show in one calendar:',

  // Making the code on first open, and failing to.
  loading: 'Making your invite…',
  error: 'Couldn’t make your invite. Check your connection and try again.',
  retry: 'Try again',

  // The Full screen press, and the white page it opens.
  fullscreen: 'Full screen',
  fullscreenTitle: 'Scan to get in',
  fullscreenTitleOpen: 'Scan to open Concert Crawl',
  fullscreenDone: 'Done',
  fullscreenNote: 'Dim room? Turn your brightness up.',
  // The line under the link; the board draws only the 2-friends case, so the
  // singular and the zero case follow the sheet's own count strings.
  fullscreenJoinedOne: '1 friend joined with your code',
  fullscreenJoinedCount: (count: number): string =>
    `${count} friends joined with your code`,

  // The link preview a pasted `/i/` link unfurls as (the `/auth/code` page's
  // Open Graph card). It names nobody, so one cached image serves every code.
  ogEyebrow: 'You’re invited',
  ogTitle: 'Every Denver show in one calendar',
  ogSub: 'Concert Crawl is invite-only for now. This link lets you in.',
  ogImageAlt: 'You’re invited to Concert Crawl',

  // An admin turned the code off. Never says why.
  offCode:
    'Your invite code is turned off. This link takes friends to the waitlist instead.',
} as const;
