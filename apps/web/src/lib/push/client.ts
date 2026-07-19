// Web Push client helper (#763 PR 9): feature detection, the permission +
// subscribe flow, and unsubscribe for the Connections push toggle. Runs
// entirely in the browser and never throws across the UI boundary — every
// failure path resolves to a typed result and logs (async-catch convention).

import { ApiError, apiClient } from '@/lib/api'
import { isIosSafari, isStandalone } from '@/lib/pwa/beforeinstallprompt'

export type PushSupport = 'supported' | 'ios-needs-install' | 'unsupported'

export interface PushDeviceState {
  support: PushSupport
  permission: NotificationPermission | 'unavailable'
  subscribed: boolean
}

export type SubscribeResult =
  | { status: 'subscribed'; id: string }
  | { status: 'permission-denied' }
  | { status: 'unsupported' }
  | { status: 'error' }

export type UnsubscribeResult =
  { status: 'unsubscribed' } | { status: 'unsupported' } | { status: 'error' }

// Feature detection. iOS Safari hides the Push API entirely until the app is
// installed to the Home Screen (iOS 16.4+), so "APIs missing in iOS Safari
// outside standalone mode" is its own state — the UI shows install guidance
// instead of a dead "unsupported".
export const getPushSupport = (): PushSupport => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'unsupported'
  }
  const hasApis =
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  if (hasApis) return 'supported'
  if (isIosSafari() && !isStandalone()) return 'ios-needs-install'
  return 'unsupported'
}

// The web-push standard's base64url VAPID key → the BufferSource shape
// pushManager.subscribe wants.
// Explicit Uint8Array<ArrayBuffer> — pushManager.subscribe's BufferSource
// rejects the ArrayBufferLike default (SharedArrayBuffer isn't allowed).
export const urlBase64ToUint8Array = (
  base64Url: string,
): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

interface SubscriptionRow {
  id?: string
}

// Upsert the browser subscription server-side (POST is upsert-by-endpoint)
// and return the row id, or null when the subscription JSON is unusable.
// Also serves as the id lookup for unsubscribe-after-reload: re-posting the
// same endpoint is idempotent and returns the existing row's id.
const syncSubscriptionToServer = async (
  token: string,
  subscription: PushSubscription,
): Promise<string | null> => {
  const json = subscription.toJSON()
  const p256dh = json.keys?.['p256dh']
  const authKey = json.keys?.['auth']
  if (!json.endpoint || !p256dh || !authKey) {
    console.error('push: subscription JSON missing endpoint or keys')
    return null
  }
  const row = await apiClient.post<SubscriptionRow>(
    '/v1/me/push/subscriptions',
    token,
    {
      endpoint: json.endpoint,
      keys: { p256dh, auth: authKey },
      // The API caps userAgent at 500 chars — trim rather than 400.
      userAgent: navigator.userAgent.slice(0, 500),
    },
  )
  return typeof row?.id === 'string' ? row.id : null
}

// Current device-level push state for rendering the toggle: support tier,
// permission, and whether this browser already holds a subscription.
export const getPushDeviceState = async (): Promise<PushDeviceState> => {
  const support = getPushSupport()
  if (support !== 'supported') {
    return { support, permission: 'unavailable', subscribed: false }
  }
  try {
    // getRegistration (not .ready) — .ready never settles when no service
    // worker is registered (e.g. dev, where Serwist is disabled).
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription =
      (await registration?.pushManager.getSubscription()) ?? null
    return {
      support,
      permission: Notification.permission,
      subscribed: subscription !== null,
    }
  } catch (err) {
    console.error('push: failed to read device state', err)
    return { support, permission: Notification.permission, subscribed: false }
  }
}

// Permission prompt (only when undecided) → pushManager subscribe (reusing an
// existing subscription when present) → POST to the API. Returns the server
// row id on success.
export const subscribeToPush = async (
  token: string,
): Promise<SubscribeResult> => {
  if (getPushSupport() !== 'supported') return { status: 'unsupported' }
  const vapidPublicKey = process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY']
  if (!vapidPublicKey) {
    console.error('push: NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set')
    return { status: 'error' }
  }
  try {
    let permission = Notification.permission
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }
    if (permission !== 'granted') return { status: 'permission-denied' }

    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) {
      console.error('push: no service worker registration')
      return { status: 'error' }
    }
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }))
    const id = await syncSubscriptionToServer(token, subscription)
    if (!id) return { status: 'error' }
    return { status: 'subscribed', id }
  } catch (err) {
    console.error('push: subscribe failed', err)
    return { status: 'error' }
  }
}

// Tear down this device's subscription: DELETE the server row (id from this
// session's subscribe when available, otherwise derived from the live
// subscription via the idempotent upsert), then unsubscribe the browser.
export const unsubscribeFromPush = async (
  token: string,
  knownId?: string,
): Promise<UnsubscribeResult> => {
  if (getPushSupport() !== 'supported') return { status: 'unsupported' }
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription =
      (await registration?.pushManager.getSubscription()) ?? null

    let id = knownId ?? null
    if (!id && subscription) {
      id = await syncSubscriptionToServer(token, subscription)
    }
    if (id) {
      try {
        await apiClient.delete<null>(`/v1/me/push/subscriptions/${id}`, token)
      } catch (deleteErr) {
        // 404 = the row is already gone (another tab / soft-disable cleanup)
        // — the goal state is reached, keep going.
        if (!(deleteErr instanceof ApiError) || deleteErr.status !== 404) {
          throw deleteErr
        }
      }
    }
    if (subscription) await subscription.unsubscribe()
    return { status: 'unsubscribed' }
  } catch (err) {
    console.error('push: unsubscribe failed', err)
    return { status: 'error' }
  }
}
