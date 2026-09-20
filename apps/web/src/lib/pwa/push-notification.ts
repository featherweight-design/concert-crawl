// The payload → showNotification mapping, extracted from `sw.ts` so it can be
// tested. A service worker registers its listeners at module scope, which a
// unit test cannot import; the parts worth asserting therefore live here, on
// the same precedent as `route-cache`.

/** Payload shape sent by packages/push/src/send-push.ts. */
export interface PushPayload {
  title: string
  body: string
  actionUrl?: string
  tag?: string
  /**
   * Post to the shade without sound or vibration. Set by the sender's
   * per-category delivery policy — the new-show fan-out rides the 3 AM crawl,
   * so those arrive quietly. Absent means audible.
   */
  silent?: boolean
}

export const isValidPushPayload = (value: unknown): value is PushPayload => {
  if (typeof value !== 'object' || value === null) return false
  if (!('title' in value) || typeof value.title !== 'string') return false
  if (value.title.length === 0 || value.title.length > 200) return false
  if (!('body' in value) || typeof value.body !== 'string') return false
  if (value.body.length === 0 || value.body.length > 500) return false
  if (
    'actionUrl' in value &&
    typeof value.actionUrl !== 'string' &&
    value.actionUrl !== undefined
  ) {
    return false
  }
  if (
    'tag' in value &&
    typeof value.tag !== 'string' &&
    value.tag !== undefined
  ) {
    return false
  }
  if (
    'silent' in value &&
    typeof value.silent !== 'boolean' &&
    value.silent !== undefined
  ) {
    return false
  }
  return true
}

// Constrain actionUrl to a same-origin path — push payloads are untrusted
// input, and `notification.data` persists across events, so a malicious value
// must never reach `client.navigate` / `openWindow` as a full URL.
export const safeSameOriginPath = (raw: unknown, origin: string): string => {
  if (typeof raw !== 'string' || raw.length === 0) return '/'
  try {
    const resolved = new URL(raw, origin)
    if (resolved.origin !== origin) {
      // Log the drop so a compromised push endpoint injecting external URLs is
      // visible rather than silently coerced to the home route.
      console.warn('sw: dropped cross-origin actionUrl', { raw })
      return '/'
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch (parseErr) {
    console.warn('sw: dropped unparseable actionUrl', { raw, err: parseErr })
    return '/'
  }
}

export const buildNotificationOptions = (
  payload: PushPayload,
  origin: string,
): NotificationOptions => ({
  body: payload.body,
  icon: '/api/pwa/icon-192',
  badge: '/api/pwa/icon-maskable-192',
  data: { actionUrl: safeSameOriginPath(payload.actionUrl, origin) },
  ...(payload.tag ? { tag: payload.tag } : {}),
  // Only set when asked for. Chrome rejects `silent: true` alongside a
  // `vibrate` pattern, so the flag stays absent rather than explicitly false —
  // that keeps the door open for a future vibrate without this line quietly
  // invalidating it.
  ...(payload.silent ? { silent: true } : {}),
})
