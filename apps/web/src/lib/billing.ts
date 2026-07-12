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

export type DismissibleNudge = 'day13' | 'past-due'

export async function dismissNudge(
  token: string,
  nudge: DismissibleNudge,
): Promise<void> {
  await apiClient.post<void>('/v1/billing/nudges/dismiss', token, { nudge })
}

export async function markTrialTakeoverShown(token: string): Promise<void> {
  await apiClient.post<void>(
    '/v1/billing/nudges/trial-takeover-shown',
    token,
    {},
  )
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

// ── PR 4.5 lifecycle endpoints (#780) ────────────────────────────────────

/** Schedules cancel_at_period_end on the live subscription. */
export async function cancelSubscription(token: string): Promise<void> {
  await apiClient.post<{ cancelAtPeriodEnd: boolean }>(
    '/v1/billing/cancel',
    token,
    {},
  )
}

/**
 * Undoes a scheduled cancel (cancel-grace only — the API 409s with
 * code 'not_in_cancel_grace' otherwise).
 */
export async function resubscribeSubscription(token: string): Promise<void> {
  await apiClient.post<{ cancelAtPeriodEnd: boolean }>(
    '/v1/billing/resubscribe',
    token,
    {},
  )
}

export type SwitchableTier = 'supporter' | 'premium'

/** Supporter ↔ Premium switch on the existing subscription (never founder). */
export async function changeSubscriptionTier(
  token: string,
  tier: SwitchableTier,
): Promise<void> {
  await apiClient.post<{
    tier: SwitchableTier
    direction: 'upgrade' | 'downgrade'
    amountDueCents: number
    creditCents: number
    currency: string
  }>('/v1/billing/change-tier', token, { tier })
}

export interface ProrationPreview {
  amountDueCents: number
  creditCents: number
  currency: string
  periodEnd: string | null
}

// Type guard (not a cast) for data crossing the API boundary — the proration
// amounts render as customer-facing dollar figures, so a malformed payload
// must fail loudly instead of printing "$NaN".
const isValidCents = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0

const parseProrationPreview = (payload: unknown): ProrationPreview | null => {
  if (typeof payload !== 'object' || payload === null) return null
  const amountDueCents: unknown = Reflect.get(payload, 'amountDueCents')
  const creditCents: unknown = Reflect.get(payload, 'creditCents')
  const currency: unknown = Reflect.get(payload, 'currency')
  const periodEnd: unknown = Reflect.get(payload, 'periodEnd')
  // The API charges in whole USD cents only, so anything fractional,
  // negative, or non-USD is a contract break — reject it.
  if (
    !isValidCents(amountDueCents) ||
    !isValidCents(creditCents) ||
    currency !== 'usd'
  ) {
    return null
  }
  if (periodEnd !== null && typeof periodEnd !== 'string') return null
  return { amountDueCents, creditCents, currency, periodEnd }
}

/** Read-only "$X.XX" preview for the switch-tier confirm surfaces. */
export async function fetchProrationPreview(
  token: string,
  tier: SwitchableTier,
): Promise<ProrationPreview> {
  const raw = await apiClient.get<unknown>(
    `/v1/billing/proration-preview?tier=${tier}`,
    token,
  )
  const preview = parseProrationPreview(raw)
  if (preview === null) {
    throw new Error('proration-preview: response payload failed validation')
  }
  return preview
}
