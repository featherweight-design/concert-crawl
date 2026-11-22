import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { PrivacyBody } from '@/app/legal/PrivacyBody';
import { TermsBody } from '@/app/legal/TermsBody';
import { sanitizeReturnPath } from '@/lib/auth/intent';
import { SsoCallback } from './SsoCallback';

interface SsoCallbackPageProps {
  searchParams: Promise<{ redirect_url?: string | string[] }>;
}

/**
 * Where Google returns to (plan 2026-11-14). Anyone can write this URL, so the return path is sanitized here,
 * once, and a signed-in visitor is simply sent on.
 */
export default async function SsoCallbackPage({
  searchParams,
}: SsoCallbackPageProps) {
  const raw = (await searchParams).redirect_url;
  const returnTo = sanitizeReturnPath(Array.isArray(raw) ? raw[0] : raw);
  const { userId } = await auth();
  if (userId) redirect(returnTo);
  return (
    <SsoCallback
      returnTo={returnTo}
      legal={{ terms: <TermsBody />, privacy: <PrivacyBody /> }}
    />
  );
}
