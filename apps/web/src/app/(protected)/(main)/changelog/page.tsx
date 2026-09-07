import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RELEASES } from '@/lib/definitions/releases'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { ReleasePage } from '@/components/consumer/release-notes/ReleasePage'

export const metadata: Metadata = {
  title: 'What we shipped — Concert Crawl',
  description: 'Every update, in one place.',
}

export default async function ChangelogPage() {
  // `release-notes` defaults on, so a failed flag read leaves the changelog
  // reachable — the harmless direction for a page that has always been public.
  if (!(await isFeatureEnabled('release-notes'))) notFound()

  return <ReleasePage releases={RELEASES} />
}
