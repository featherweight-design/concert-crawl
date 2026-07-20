import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      {/* forceRedirectUrl routes new users through `/auth/complete`, which
          consumes the invite cookie set by `/auth/code` and POSTs
          `/v1/auth/redeem-code` so the invite row is marked used. Without
          it Clerk defaults to `/`, `/auth/complete` never runs, and every
          issued invite stays in `used_by IS NULL` state (#1113). */}
      <SignUp forceRedirectUrl="/auth/complete" />
    </main>
  )
}
