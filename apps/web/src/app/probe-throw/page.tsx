import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isProbeThrowEnabled } from '@/lib/definitions/probe-throw';

// A test fixture, not a product page: see `lib/definitions/probe-throw.ts`.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ProbeThrowPage() {
  if (!isProbeThrowEnabled()) notFound();
  throw new Error('probe-throw: deliberate error for the global-error probe');
}
