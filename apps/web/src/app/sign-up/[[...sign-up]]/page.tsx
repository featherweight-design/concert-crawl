import { SignUp } from '@clerk/nextjs';
import { completeTarget } from '@/lib/auth/complete-target';

interface SignUpPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  // The destination and the chosen tier are forwarded by hand (see
  // `completeTarget` for why): Clerk's `forceRedirectUrl` outranks its own
  // `redirect_url`, and it drops every param it does not own.
  const target = completeTarget(await searchParams);

  return (
    <main className="flex min-h-dvh items-center justify-center">
      {/* forceRedirectUrl routes new users through `/auth/complete`, which
          consumes the invite cookie set by `/auth/code` and POSTs
          `/v1/auth/redeem-code` so the invite row is marked used. Without
          it Clerk defaults to `/`, `/auth/complete` never runs, and every
          issued invite stays in `used_by IS NULL` state (#1113). */}
      <SignUp forceRedirectUrl={target} />
    </main>
  );
}
