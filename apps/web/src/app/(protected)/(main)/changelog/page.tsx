import type { Metadata } from 'next'
import { RELEASES } from '@/lib/definitions/releases'
import { ReleasePage } from '@/components/consumer/release-notes/ReleasePage'

export const metadata: Metadata = {
  title: 'What we shipped — Concert Crawl',
  description: 'Every update, in one place.',
}

export default function ChangelogPage() {
  return <ReleasePage releases={RELEASES} />
}
