/**
 * The printed invite poster. It hangs in public, so this is consumer copy and
 * goes through copy-review, though it is drawn from an admin page. No launch
 * date anywhere: a poster on a wall must never go stale.
 */
export const POSTER_COPY = {
  chip: 'Beta testers wanted',
  kicker: 'Launching later · Testing now',
  // The headline is two parts so the second can carry the gradient.
  headlineLead: 'Every Denver show.',
  headlineEm: 'One list.',
  // With no count to give (the venue list failed to load), the sub drops it.
  sub: (venueCount: number) =>
    `We check ${
      venueCount === 0
        ? 'venue calendars'
        : venueCount === 1
          ? '1 venue calendar'
          : `${venueCount} venue calendars`
    } every night and put every show in one place. Help us test it before launch. It’s free.`,
  // Closes the venue line when it had to stop short of every venue.
  andMore: 'and more',
  scan: 'Scan to test it',
  // "This poster lets in <b>50 testers</b>. When the spots…": the count is bold.
  seatsLead: 'This poster lets in ',
  seatsCount: (seats: number) =>
    `${seats} ${seats === 1 ? 'tester' : 'testers'}`,
  seatsTail: '. When the spots are gone, they’re gone.',
  typed: 'No camera? Go to',
  codeLabel: 'and enter',
  fine: 'Not affiliated with the venues listed.',
  // The QR's accessible name, for the screen preview.
  qrLabel: (code: string) => `QR code for invite ${code}`,
} as const;
