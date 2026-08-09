import { SignUp } from '@clerk/nextjs'
import { isSafeReturnPath, PENDING_TIER_PARAM } from '@/lib/auth/intent'
import { decodePendingTier } from '@/components/consumer/tier-picker/lib/pending-tier'

interface SignUpPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  // `forceRedirectUrl` outranks Clerk's own `redirect_url` param, so a caller
  // that appends one is silently ignored unless we forward it ourselves.
  // Before launch that went unnoticed: /sign-up was invite-gated, middleware
  // bounced through /auth/code, and the beta funnel stashed the destination in
  // a signed cookie. Once /sign-up opens, nothing writes that cookie and every
  // caller's destination was being dropped on the floor.
  const params = await searchParams
  const raw = params['redirect_url']
  const requested = typeof raw === 'string' ? raw : null

  // Sanitised here as well as on read: it arrives from the querystring, so it
  // is attacker-controllable, and /auth/complete is a redirect.
  const forwarded = new URLSearchParams()
  if (isSafeReturnPath(requested) && requested)
    forwarded.set('return', requested)

  // The tier the picker's Sign up CTA was tapped on (#1284), forwarded for the
  // same reason as the destination: Clerk drops everything it does not own.
  const tier = decodePendingTier(
    typeof params[PENDING_TIER_PARAM] === 'string'
      ? params[PENDING_TIER_PARAM]
      : null,
  )
  if (tier) forwarded.set(PENDING_TIER_PARAM, tier)

  const query = forwarded.toString()
  const target = query ? `/auth/complete?${query}` : '/auth/complete'

  return (
    <main className="flex min-h-screen items-center justify-center">
      {/* forceRedirectUrl routes new users through `/auth/complete`, which
          consumes the invite cookie set by `/auth/code` and POSTs
          `/v1/auth/redeem-code` so the invite row is marked used. Without
          it Clerk defaults to `/`, `/auth/complete` never runs, and every
          issued invite stays in `used_by IS NULL` state (#1113). */}
      <SignUp forceRedirectUrl={target} />
    </main>
  )
}
