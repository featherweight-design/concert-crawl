// Presentational hint for the Browse route's loading skeleton.
//
// The "Based on your taste" shelf is premium + Spotify-connected only, but
// `events/loading.tsx` runs before any of that is knowable: the plan comes
// from the API (`/v1/users/me` → three DB tables), not from Clerk session
// claims, so a route-level fallback cannot evaluate the entitlement without
// a round-trip it can't afford. Without a signal the fallback reserves no
// space and the shelf shoves the whole page down when it paints.
//
// So the client records what it last resolved. This value is NEVER an
// access decision — it only chooses whether the skeleton reserves the
// shelf's vertical footprint. A stale or forged value costs at most one
// wrongly-sized skeleton for a single paint; the real shelf still gates on
// the entitlement and the API still enforces it server-side.
export const SHELF_HINT_COOKIE = 'cc_taste_shelf'

const SHELF_HINT_SHOW = '1'
const SHELF_HINT_HIDE = '0'

// Long-lived: the underlying fact (has premium + linked Spotify) changes on
// the order of months, and a wrong value self-heals on the next Browse load.
const SHELF_HINT_MAX_AGE = 60 * 60 * 24 * 30

// The value carries the Clerk user id it was resolved for. One browser can
// hold sessions for several accounts (sign out → sign in as someone else),
// and an unscoped `1` would reserve a premium shelf's footprint for whoever
// signed in next. Pairing the flag with its owner makes a hint written for
// another account simply not match, so it reserves nothing.
//
// The id is percent-encoded so a `;` or `=` in it could never terminate the
// value and inject cookie attributes. Clerk ids don't contain those today —
// this keeps that from being load-bearing.
const shelfHintValue = (userId: string, shouldShow: boolean) =>
  `${encodeURIComponent(userId)}:${shouldShow ? SHELF_HINT_SHOW : SHELF_HINT_HIDE}`

// True only when the cookie was written for THIS user and says "show".
// Anything else — absent, another account's, malformed — under-reserves,
// which is the safe direction: a free viewer must never see the ghost.
export const shouldReserveShelf = (
  cookieValue: string | undefined,
  userId: string | null,
): boolean => userId !== null && cookieValue === shelfHintValue(userId, true)

export const writeShelfHint = (userId: string, shouldShow: boolean): void => {
  const attrs = `path=/; max-age=${SHELF_HINT_MAX_AGE}; samesite=lax`
  const secure = window.location.protocol === 'https:' ? '; secure' : ''
  document.cookie = `${SHELF_HINT_COOKIE}=${shelfHintValue(userId, shouldShow)}; ${attrs}${secure}`
}
