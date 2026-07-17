import Link from 'next/link'
import { OFFLINE_COPY } from './definitions/copy'

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold text-fg">{OFFLINE_COPY.heading}</h1>
      <p className="max-w-sm text-fg-muted">{OFFLINE_COPY.body}</p>
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center rounded-md bg-accent px-4 py-2 text-fg-on-accent"
      >
        {OFFLINE_COPY.backHome}
      </Link>
    </main>
  )
}
