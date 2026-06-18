/**
 * Canonical href for the admin event editor.
 * Keep all callers (row menus, inspector, deep links) using this helper so
 * future path changes only need to be made in one place.
 */
export const editEventHref = (eventId: string): string =>
  `/admin/events/${eventId}/edit`
