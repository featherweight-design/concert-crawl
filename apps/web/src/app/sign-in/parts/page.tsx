import { notFound } from 'next/navigation';
import { AuthParts } from '@/components/auth/flow/AuthParts';

/**
 * The custom auth pieces in every state, for the contact sheet and review.
 * Development only: a production build answers 404, so nothing here ships.
 */
export default function AuthPartsPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <AuthParts />;
}
