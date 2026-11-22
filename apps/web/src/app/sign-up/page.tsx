import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BetaBody } from '@/app/legal/BetaBody';
import { PrivacyBody } from '@/app/legal/PrivacyBody';
import { TermsBody } from '@/app/legal/TermsBody';
import { completeTarget } from '@/lib/auth/complete-target';
import { loadIntentSubject } from '@/lib/auth/intent-subject';
import { isSafeReturnPath } from '@/lib/auth/intent';
import { INVITE_COOKIE_NAME, verifyInviteCookie } from '@/lib/invite-cookie';
import { isPublicBrowseEnabled } from '@/lib/launch-mode';
import { SignUpFlow } from './SignUpFlow';

interface SignUpPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * The custom sign-up (plan 2026-11-14), live since the cutover
 * (PR 9). The invite-cookie gate is the parent layout's, unchanged. Every
 * sign-up still ends at `/auth/complete` (it redeems the invite, then
 * onboarding), so the target is computed here, once, by the same helper as the
 * stock page. A signed-in visitor already has an account: on to the target.
 */
export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const target = completeTarget(params);
  const { userId } = await auth();
  if (userId) redirect(target);

  const beta = !isPublicBrowseEnabled();

  // The invite cookie is httpOnly, so only the server can read it. The layout
  // already sent a visitor without a valid one to /auth/code; a null here is
  // the cookie expiring in between, and just means no chip.
  let inviteCode: string | null = null;
  const secret = process.env.INVITE_COOKIE_SECRET;
  if (beta && secret) {
    const value = (await cookies()).get(INVITE_COOKIE_NAME)?.value;
    inviteCode = value
      ? (verifyInviteCookie(value, secret)?.code ?? null)
      : null;
  }

  // "Use a different code" keeps the destination, if it is a safe one, and
  // says it is a change: the code page then releases the code they redeemed.
  const raw = params['redirect_url'];
  const requested = typeof raw === 'string' ? raw : null;
  const change: Record<string, string> = { change: '1' };
  if (requested && isSafeReturnPath(requested))
    change['redirect_url'] = requested;
  const changeHref = `/auth/code?${new URLSearchParams(change).toString()}`;
  const intent = await loadIntentSubject(change['redirect_url'] ?? '');

  return (
    <SignUpFlow
      target={target}
      intent={intent}
      beta={beta}
      inviteCode={inviteCode}
      changeHref={changeHref}
      legal={{
        terms: <TermsBody />,
        privacy: <PrivacyBody />,
        beta: beta ? <BetaBody /> : null,
      }}
    />
  );
}
