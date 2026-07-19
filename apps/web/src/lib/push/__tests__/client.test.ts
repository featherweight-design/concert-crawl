// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiError } from '@/lib/api'

const apiMocks = vi.hoisted(() => ({
  post: vi.fn(),
  del: vi.fn(),
}))

vi.mock(import('@/lib/api'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      post: apiMocks.post,
      delete: apiMocks.del,
    },
  }
})

import {
  getPushDeviceState,
  getPushSupport,
  subscribeToPush,
  unsubscribeFromPush,
  urlBase64ToUint8Array,
} from '../client'

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

// A valid base64url-encoded VAPID-style key for the env stub.
const VAPID_KEY = 'BPfBc3vXPnFV3EYWXLrAyfDpDlqCoZUn-l2Q'

class NotificationStub {
  static permission: NotificationPermission = 'granted'
  static requestPermission = vi.fn(
    async (): Promise<NotificationPermission> => 'granted',
  )
}

interface RegistrationStub {
  pushManager: {
    getSubscription: ReturnType<typeof vi.fn>
    subscribe: ReturnType<typeof vi.fn>
  }
}

const makeRegistration = (): RegistrationStub => ({
  pushManager: {
    getSubscription: vi.fn(async () => null),
    subscribe: vi.fn(),
  },
})

const makeSubscription = (endpoint = 'https://push.example/ep1') => ({
  toJSON: () => ({ endpoint, keys: { p256dh: 'p-key', auth: 'a-key' } }),
  unsubscribe: vi.fn(async () => true),
})

let registration: RegistrationStub
const getRegistration = vi.fn(
  async (): Promise<RegistrationStub | undefined> => registration,
)

const stubSupported = () => {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { getRegistration },
    configurable: true,
  })
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', NotificationStub)
}

const stubNavigatorProps = (userAgent: string, maxTouchPoints: number) => {
  Object.defineProperty(navigator, 'userAgent', {
    value: userAgent,
    configurable: true,
  })
  Object.defineProperty(navigator, 'maxTouchPoints', {
    value: maxTouchPoints,
    configurable: true,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', VAPID_KEY)
  NotificationStub.permission = 'granted'
  NotificationStub.requestPermission = vi.fn(
    async (): Promise<NotificationPermission> => 'granted',
  )
  registration = makeRegistration()
  getRegistration.mockImplementation(async () => registration)
  apiMocks.post.mockResolvedValue({ id: 'row-1' })
  apiMocks.del.mockResolvedValue(null)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'serviceWorker')
  Reflect.deleteProperty(navigator, 'userAgent')
  Reflect.deleteProperty(navigator, 'maxTouchPoints')
})

describe('urlBase64ToUint8Array', () => {
  it('decodes base64url (with - and _) into bytes', () => {
    // 'AQID' = [1, 2, 3]; '-_8' = [251, 255]
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3])
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255])
  })
})

describe('getPushSupport', () => {
  it('reports supported when serviceWorker, PushManager and Notification exist', () => {
    stubSupported()
    expect(getPushSupport()).toBe('supported')
  })

  it('reports ios-needs-install for iOS Safari outside standalone mode', () => {
    stubNavigatorProps(IPHONE_SAFARI, 5)
    // isStandalone reads matchMedia — jsdom doesn't implement it.
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    )
    expect(getPushSupport()).toBe('ios-needs-install')
  })

  it('reports unsupported when the APIs are missing on a non-iOS browser', () => {
    expect(getPushSupport()).toBe('unsupported')
  })
})

describe('getPushDeviceState', () => {
  it('reports subscribed with granted permission when a subscription exists', async () => {
    stubSupported()
    registration.pushManager.getSubscription.mockResolvedValue(
      makeSubscription(),
    )
    expect(await getPushDeviceState()).toEqual({
      support: 'supported',
      permission: 'granted',
      subscribed: true,
    })
  })

  it('reports unsubscribed when no service worker is registered', async () => {
    stubSupported()
    getRegistration.mockResolvedValue(undefined)
    expect(await getPushDeviceState()).toEqual({
      support: 'supported',
      permission: 'granted',
      subscribed: false,
    })
  })

  it('reports unavailable permission on unsupported browsers', async () => {
    expect(await getPushDeviceState()).toEqual({
      support: 'unsupported',
      permission: 'unavailable',
      subscribed: false,
    })
  })
})

describe('subscribeToPush', () => {
  it('subscribes, POSTs the subscription and returns the row id when granted', async () => {
    stubSupported()
    const subscription = makeSubscription()
    registration.pushManager.subscribe.mockResolvedValue(subscription)

    const result = await subscribeToPush('token-1')

    expect(result).toEqual({ status: 'subscribed', id: 'row-1' })
    expect(registration.pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    )
    expect(apiMocks.post).toHaveBeenCalledWith(
      '/v1/me/push/subscriptions',
      'token-1',
      expect.objectContaining({
        endpoint: 'https://push.example/ep1',
        keys: { p256dh: 'p-key', auth: 'a-key' },
      }),
    )
  })

  it('requests permission when undecided and proceeds on grant', async () => {
    stubSupported()
    NotificationStub.permission = 'default'
    registration.pushManager.subscribe.mockResolvedValue(makeSubscription())

    const result = await subscribeToPush('token-1')

    expect(NotificationStub.requestPermission).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('subscribed')
  })

  it('reuses an existing browser subscription instead of re-subscribing', async () => {
    stubSupported()
    registration.pushManager.getSubscription.mockResolvedValue(
      makeSubscription(),
    )

    const result = await subscribeToPush('token-1')

    expect(result.status).toBe('subscribed')
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled()
  })

  it('returns permission-denied without subscribing when the user denies', async () => {
    stubSupported()
    NotificationStub.permission = 'default'
    NotificationStub.requestPermission = vi.fn(
      async (): Promise<NotificationPermission> => 'denied',
    )

    expect(await subscribeToPush('token-1')).toEqual({
      status: 'permission-denied',
    })
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled()
    expect(apiMocks.post).not.toHaveBeenCalled()
  })

  it('returns unsupported when the push APIs are missing', async () => {
    expect(await subscribeToPush('token-1')).toEqual({ status: 'unsupported' })
  })

  it('returns error when the VAPID public key env is unset', async () => {
    stubSupported()
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', '')
    expect(await subscribeToPush('token-1')).toEqual({ status: 'error' })
  })

  it('returns error when no service worker registration exists', async () => {
    stubSupported()
    getRegistration.mockResolvedValue(undefined)
    expect(await subscribeToPush('token-1')).toEqual({ status: 'error' })
  })

  it('returns error and logs when the subscriptions POST fails', async () => {
    stubSupported()
    registration.pushManager.subscribe.mockResolvedValue(makeSubscription())
    apiMocks.post.mockRejectedValue(new ApiError(500, 'Insert failed'))

    expect(await subscribeToPush('token-1')).toEqual({ status: 'error' })
    expect(console.error).toHaveBeenCalled()
  })
})

describe('unsubscribeFromPush', () => {
  it('deletes by the known id and unsubscribes the browser', async () => {
    stubSupported()
    const subscription = makeSubscription()
    registration.pushManager.getSubscription.mockResolvedValue(subscription)

    const result = await unsubscribeFromPush('token-1', 'row-9')

    expect(result).toEqual({ status: 'unsubscribed' })
    expect(apiMocks.del).toHaveBeenCalledWith(
      '/v1/me/push/subscriptions/row-9',
      'token-1',
    )
    expect(apiMocks.post).not.toHaveBeenCalled()
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('derives the row id via the idempotent upsert when no id is known', async () => {
    stubSupported()
    const subscription = makeSubscription()
    registration.pushManager.getSubscription.mockResolvedValue(subscription)

    const result = await unsubscribeFromPush('token-1')

    expect(result).toEqual({ status: 'unsubscribed' })
    expect(apiMocks.post).toHaveBeenCalledTimes(1)
    expect(apiMocks.del).toHaveBeenCalledWith(
      '/v1/me/push/subscriptions/row-1',
      'token-1',
    )
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('treats a DELETE 404 as already-removed and still unsubscribes', async () => {
    stubSupported()
    const subscription = makeSubscription()
    registration.pushManager.getSubscription.mockResolvedValue(subscription)
    apiMocks.del.mockRejectedValue(new ApiError(404, 'Not found'))

    const result = await unsubscribeFromPush('token-1', 'row-9')

    expect(result).toEqual({ status: 'unsubscribed' })
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('succeeds as a no-op when nothing is subscribed and no id is known', async () => {
    stubSupported()
    expect(await unsubscribeFromPush('token-1')).toEqual({
      status: 'unsubscribed',
    })
    expect(apiMocks.del).not.toHaveBeenCalled()
  })

  it('returns error and logs when the DELETE fails with a non-404', async () => {
    stubSupported()
    registration.pushManager.getSubscription.mockResolvedValue(
      makeSubscription(),
    )
    apiMocks.del.mockRejectedValue(new ApiError(500, 'Delete failed'))

    expect(await unsubscribeFromPush('token-1', 'row-9')).toEqual({
      status: 'error',
    })
    expect(console.error).toHaveBeenCalled()
  })

  it('returns unsupported when the push APIs are missing', async () => {
    expect(await unsubscribeFromPush('token-1')).toEqual({
      status: 'unsupported',
    })
  })
})
