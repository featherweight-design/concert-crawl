// apps/api/src/lib/definitions/notification-windows.ts
// Window constants for the consumer notification surface (#737).
//
// Backfill (30d) and retention (90d) are deliberately DIFFERENT numbers and
// both live here so the gap is visible in one place:
//
//   - BACKFILL is a legibility bound. The panel's relative-time formatter
//     switches to an absolute date past 7 days, so a 30-day floor keeps every
//     rendered row readable. The list endpoint, the unread count and
//     `read-all` all operate over exactly this window.
//   - RETENTION is a data-availability bound. Rows survive 90 days so a future
//     digest (or a support question) still has them, without widening what the
//     panel shows today. The daily prune deletes past it.
//
// No consumer of these numbers may re-declare them as literals.

/** The list endpoint and unread count never look further back than this. */
export const NOTIFICATION_BACKFILL_DAYS = 30

/** The daily prune deletes `user_notification` rows older than this. */
export const NOTIFICATION_RETENTION_DAYS = 90

/** Default page size for the panel; "Older notifications" fetches the next. */
export const NOTIFICATION_PAGE_SIZE = 20

/** Hard ceiling a client may request via `?limit=`. */
export const NOTIFICATION_PAGE_SIZE_MAX = 50
