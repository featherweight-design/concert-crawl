import { decodePendingTier } from './pending-tier';
import { isSafeReturnPath, PENDING_TIER_PARAM } from '@/lib/auth/intent';

/**
 * Where a new account goes once Clerk has made it: `/auth/complete`, which
 * redeems the invite and sends the visitor on to onboarding. One source for the
 * stock sign-up page and the custom one.
 *
 * Clerk's `forceRedirectUrl` outranks its own `redirect_url` param, and Clerk
 * drops every param it does not own, so the destination and the chosen tier are
 * forwarded here by hand. Both arrive in the query string, so both are
 * attacker-controllable: the destination is sanitised here as well as on read
 * (`/auth/complete` is a redirect), and a tier that is not one of ours is
 * dropped. Before launch the destination also rides a signed cookie set by
 * `/auth/code`; that cookie wins on the other side.
 */
export function completeTarget(
  params: Record<string, string | string[] | undefined>,
): string {
  const raw = params['redirect_url'];
  const requested = typeof raw === 'string' ? raw : null;

  const forwarded = new URLSearchParams();
  if (isSafeReturnPath(requested) && requested) {
    forwarded.set('return', requested);
  }

  const tier = decodePendingTier(
    typeof params[PENDING_TIER_PARAM] === 'string'
      ? params[PENDING_TIER_PARAM]
      : null,
  );
  if (tier) forwarded.set(PENDING_TIER_PARAM, tier);

  const query = forwarded.toString();
  return query ? `/auth/complete?${query}` : '/auth/complete';
}
