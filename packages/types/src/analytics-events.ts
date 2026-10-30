// The web app's typed analytics events (posthog-js): poster sharing only,
// plus the tier picker's entry type, which picks its header copy. Billing and
// plan events are not sent: the app is moving to a free tier, and the privacy
// policy discloses only usage and share events.

// Where the tier picker was opened from. The picker picks its header copy by
// entry, so `logged-out-watch` and `logged-out-paywall` stay distinct.
export type PickerEntry =
  | 'settings'
  | 'paywall'
  | 'logged-out-paywall'
  | 'logged-out-watch'
  | 'logged-out-going'
  | 'logged-out-price'
  // A gated Follow tap on the artist page (#1115).
  | 'logged-out-follow'
  // A signed-in user committing their onboarding artist picks without the
  // entitlement to follow (PR 8).
  | 'follow'
  // A gated status report on the event page.
  | 'logged-out-report'
  // Reopened on the far side of sign-up, on the tier the visitor had picked
  // before they had an account (#1284).
  | 'post-signup'
  | 'takeover'

/** Where a share sheet was opened from. One surface today; named so a second
 * one is a new member rather than an untyped string. */
export type ShareSurface = 'event-detail'

/**
 * The destinations the sheet actually offers. The keys are minted at the
 * `track` call-sites in `apps/web/.../share/ShareSheet.tsx` — `destinations.ts`
 * holds the capability helpers each one drives, not these identifiers.
 */
export type ShareDestination = 'system' | 'save-image' | 'copy-link'

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
export type ShareCardRatio = 'story' | 'square' | 'link'

export type ShareCardTheme =
  | 'electric'
  | 'jade'
  | 'light'
  | 'pulse'
  | 'forge'
  | 'bluenote'
  | 'drip'
  | 'cedar'
  | 'gloss'

// Poster sharing (#72): the only typed events the web app sends.
export interface ShareEventMap {
  // `authed` distinguishes a share from a signed-in user from one taken on the
  // public mirror; no userId is attached here — the emitter already identifies.
  share_sheet_opened: {
    eventId: string
    surface: ShareSurface
    authed: boolean
  }
  share_destination_selected: { eventId: string; destination: ShareDestination }
  // `eventId` so a render joins back to the `share_sheet_opened` and
  // `share_destination_selected` rows for the same show — without it the render
  // count is a standalone total and the funnel cannot be walked end to end.
  share_card_rendered: {
    eventId: string
    ratio: ShareCardRatio
    theme: ShareCardTheme
    cacheHit: boolean
  }
  // `referrer` is the referring host only, never the full URL — a full referrer
  // can carry a query string belonging to somebody else's session.
  public_event_viewed: { eventId: string; referrer: string | null }
  // The Passport (#85). No `eventId` — the card is about the person, not a
  // show — and no `copy-link` destination, because it has no public URL.
  passport_shared: {
    destination: Extract<ShareDestination, 'system' | 'save-image'>
  }
}

export type ShareEvent = keyof ShareEventMap
