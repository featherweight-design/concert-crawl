import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { sanitizeReturnPath } from '@/lib/auth/intent';
import { SignInFlow } from './SignInFlow';

interface SignInNewProps {
  searchParams: Promise<{ redirect_url?: string | string[] }>;
}

/**
 * The custom sign-in, dark at `/sign-in/new` until the cutover (plan 2026-11-14).
 * A signed-in visitor goes straight through to where they were headed; the
 * return path is sanitized here, once, and handed down as a prop.
 */
export default async function SignInNewPage({ searchParams }: SignInNewProps) {
  const raw = (await searchParams).redirect_url;
  const returnTo = sanitizeReturnPath(Array.isArray(raw) ? raw[0] : raw);
  const { userId } = await auth();
  if (userId) redirect(returnTo);
  return <SignInFlow returnTo={returnTo} />;
}
