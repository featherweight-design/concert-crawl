import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FEATURE_CARDS } from '@/lib/definitions/releases';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { WhatsNewPage } from '@/components/consumer/whats-new/WhatsNewPage';

export const metadata: Metadata = {
  title: 'What you can do here | Concert Crawl',
  description: 'The big stuff, one card each.',
};

export default async function WhatsNewRoute() {
  // Same switch as the changelog it sits beside: `release-notes` defaults on.
  if (!(await isFeatureEnabled('release-notes'))) notFound();

  return <WhatsNewPage cards={FEATURE_CARDS} />;
}
