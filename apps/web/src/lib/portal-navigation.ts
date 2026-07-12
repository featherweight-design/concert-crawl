// Shared Stripe Billing Portal navigation: token → portal session →
// full-page navigate. Used by both the settings plan card and the tier
// picker's manage action so the mechanics can't drift between the two.
// Callers own their pending/error UI state; throws on missing auth or
// session failure so each surface can present its own copy.

import { createPortalSession } from '@/lib/billing'

// Defense-in-depth: only follow an absolute https URL — a relative,
// malformed, or non-https (e.g. javascript:) value from the API must never
// reach a navigation sink.
const resolvePortalUrl = async (
  getToken: () => Promise<string | null>,
): Promise<string> => {
  const token = await getToken()
  if (!token) throw new Error('Not authenticated')
  const { url } = await createPortalSession(token)
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:') {
    throw new Error('Portal session returned a non-HTTPS URL')
  }
  return parsed.toString()
}

export async function navigateToPortalSession(
  getToken: () => Promise<string | null>,
): Promise<void> {
  window.location.assign(await resolvePortalUrl(getToken))
}

/**
 * New-tab variant for the manage sheet's Stripe rows ("Opens Stripe in a new
 * tab" — #780). The tab is opened synchronously inside the click gesture so
 * popup blockers allow it, then pointed at the session URL once it resolves;
 * on failure it is closed so no orphan blank tab lingers.
 */
export async function openPortalSessionInNewTab(
  getToken: () => Promise<string | null>,
): Promise<void> {
  const portalTab = window.open('about:blank', '_blank')
  if (portalTab) portalTab.opener = null
  try {
    const portalUrl = await resolvePortalUrl(getToken)
    if (portalTab) {
      portalTab.location.href = portalUrl
    } else {
      // Popup blocked — fall back to same-tab so the action still works.
      window.location.assign(portalUrl)
    }
  } catch (err) {
    portalTab?.close()
    throw err
  }
}
