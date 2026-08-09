import { SignUp } from '@clerk/nextjs'
import { isSafeReturnPath } from '@/lib/auth/intent'

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
  const target = isSafeReturnPath(requested)
    ? `/auth/complete?return=${encodeURIComponent(requested ?? '')}`
    : '/auth/complete'

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
