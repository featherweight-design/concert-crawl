// The web app's typed analytics events (posthog-js): poster sharing only,
// plus the tier picker's entry type, which picks its header copy. Billing and
// plan events are not sent: the app is moving to a free tier, and the privacy
// policy discloses only usage and share events.

// Where the tier picker was opened from. The picker picks its header copy by
// entry. A signed-out tap no longer opens the picker at all (it goes to
// sign-in), so there are no `logged-out-*` entries.
export type PickerEntry =
  | 'settings'
  | 'paywall'
  // A signed-in user committing their onboarding artist picks without the
  // entitlement to follow (PR 8).
  | 'follow'
  | 'takeover';

/** Where a share sheet was opened from. One surface today; named so a second
 * one is a new member rather than an untyped string. */
export type ShareSurface = 'event-detail';

/**
 * The destinations the sheet actually offers. The keys are minted at the
 * `track` call-sites in `apps/web/.../share/ShareSheet.tsx` — `destinations.ts`
 * holds the capability helpers each one drives, not these identifiers.
 */
export type ShareDestination = 'system' | 'save-image' | 'copy-link';

/**
 * Where a share of the app itself (the QR sheet) went: the system sheet, a
 * copied link, or the full-screen code. A sibling of `ShareDestination`, not a
 * member of it: `fullscreen` shares nothing, it holds the code up to a friend.
 */
export type AppShareDestination = 'system' | 'copy-link' | 'fullscreen';

/**
 * The poster shapes and themes a card can be drawn in.
 *
 * Mirrored rather than imported: the sources are `ShareRatio` in
 * `apps/web/.../share/definitions/ratios.ts` and `ThemeName` in
 * `apps/web/src/theme/themes.ts`, and this package cannot depend on the web app.
 * `analytics-events.contract.test.ts` in `apps/web` asserts both directions of
 * assignability, so adding a shape or a theme there without updating these
 * fails typecheck rather than silently emitting an unmodelled value.
 */
export type ShareCardRatio = 'story' | 'square' | 'link';

export type ShareCardTheme =
  | 'electric'
  | 'jade'
  | 'light'
  | 'pulse'
  | 'forge'
  | 'bluenote'
  | 'drip'
  | 'cedar'
  | 'gloss';

// Poster sharing (#72): the only typed events the web app sends.
export interface ShareEventMap {
  // `authed` distinguishes a share from a signed-in user from one taken on the
  // public mirror; no userId is attached here — the emitter already identifies.
  share_sheet_opened: {
    eventId: string;
    surface: ShareSurface;
    authed: boolean;
  };
  share_destination_selected: {
    eventId: string;
    destination: ShareDestination;
  };
  // `eventId` so a render joins back to the `share_sheet_opened` and
  // `share_destination_selected` rows for the same show — without it the render
  // count is a standalone total and the funnel cannot be walked end to end.
  share_card_rendered: {
    eventId: string;
    ratio: ShareCardRatio;
    theme: ShareCardTheme;
    cacheHit: boolean;
  };
  // `referrer` is the referring host only, never the full URL — a full referrer
  // can carry a query string belonging to somebody else's session.
  public_event_viewed: { eventId: string; referrer: string | null };
  // The Passport (#85). No `eventId` — the card is about the person, not a
  // show — and no `copy-link` destination, because it has no public URL.
  passport_shared: {
    destination: Extract<ShareDestination, 'system' | 'save-image'>;
  };
  // The artist page's Share (B+ B10). A plain link with no card, so no
  // `save-image`, and keyed on the slug because the link is the artist page.
  artist_shared: {
    artistSlug: string;
    destination: Extract<ShareDestination, 'system' | 'copy-link'>;
  };
  // Share Concert Crawl by QR: the account-menu sheet. A sibling event rather
  // than `subject: 'app'` on `share_destination_selected`, whose `eventId` is
  // required and means a show. No code, no URL and no user id: the code is a
  // person's invite, and the emitter already identifies who pressed.
  app_share_destination_selected: {
    destination: AppShareDestination;
  };
}

export type ShareEvent = keyof ShareEventMap;
