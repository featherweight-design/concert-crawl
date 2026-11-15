import type { Metadata } from 'next';
import Link from 'next/link';

import { LEGAL_COPY } from '../definitions/copy';
import { TermsBody } from '../TermsBody';

export const metadata: Metadata = {
  title: 'Terms of Service — Concert Crawl',
  robots: { index: false },
};

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          <span aria-hidden>←</span>
          <span>{LEGAL_COPY.shared.backLink}</span>
        </Link>

        <TermsBody />
      </div>
    </div>
  );
}
