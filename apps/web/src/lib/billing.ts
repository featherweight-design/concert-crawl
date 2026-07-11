import type {
  CheckoutSessionResponse,
  FounderWindowView,
} from '@concert-crawl/types'
import { apiClient, publicApiClient } from './api'

export async function fetchFounderWindow(): Promise<FounderWindowView> {
  return publicApiClient.get<FounderWindowView>('/v1/billing/founder-window')
}

export async function createCheckoutSession(
  token: string,
  tier: 'supporter' | 'premium' | 'founder',
): Promise<CheckoutSessionResponse> {
  return apiClient.post<CheckoutSessionResponse>(
    '/v1/billing/checkout-session',
    token,
    { tier },
  )
}

export async function abandonCheckout(
  token: string,
  subscriptionId: string,
): Promise<void> {
  await apiClient.post<void>('/v1/billing/checkout-abandon', token, {
    subscriptionId,
  })
}

export async function createPortalSession(
  token: string,
): Promise<{ url: string }> {
  return apiClient.post<{ url: string }>(
    '/v1/billing/portal-session',
    token,
    {},
  )
}
