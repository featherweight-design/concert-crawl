// Shared Stripe Billing Portal navigation: token → portal session →
// full-page navigate. Used by both the settings plan card and the tier
// picker's manage action so the mechanics can't drift between the two.
// Callers own their pending/error UI state; throws on missing auth or
// session failure so each surface can present its own copy.

import { createPortalSession } from './billing'

export async function navigateToPortalSession(
  getToken: () => Promise<string | null>,
): Promise<void> {
  const token = await getToken()
  if (!token) throw new Error('Not authenticated')
  const { url } = await createPortalSession(token)
  window.location.assign(url)
}
