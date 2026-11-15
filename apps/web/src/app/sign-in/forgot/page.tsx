import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { sanitizeReturnPath } from '@/lib/auth/intent';
import { ForgotFlow } from './ForgotFlow';

interface ForgotProps {
  searchParams: Promise<{ redirect_url?: string | string[] }>;
}

/**
 * Reset a password, dark at `/sign-in/forgot` until the cutover (plan
 * 2026-11-14). The email is asked again here rather than carried in the URL.
 * A signed-in visitor goes straight on; the return path is sanitized once, here.
 */
export default async function ForgotPage({ searchParams }: ForgotProps) {
  const raw = (await searchParams).redirect_url;
  const returnTo = sanitizeReturnPath(Array.isArray(raw) ? raw[0] : raw);
  const { userId } = await auth();
  if (userId) redirect(returnTo);
  return <ForgotFlow returnTo={returnTo} />;
}
