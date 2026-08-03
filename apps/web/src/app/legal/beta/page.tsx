import type { Metadata } from 'next'
import Link from 'next/link'

import { LEGAL_COPY } from '../definitions/copy'

export const metadata: Metadata = {
  title: 'Private Beta — Concert Crawl',
  robots: { index: false },
}

export default function BetaAgreementPage() {
  const copy = LEGAL_COPY.beta

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          <span aria-hidden>←</span>
          <span>{LEGAL_COPY.shared.backLink}</span>
        </Link>

        <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-fg">
          {copy.heading}
        </h1>
        <p className="mb-10 text-sm text-fg-muted">{copy.effectiveDate}</p>

        <div className="space-y-8 text-[15px] leading-relaxed text-fg-muted">
          <section>
            <h2 className="mb-3 text-base font-bold text-fg">
              {copy.innerCircle.title}
            </h2>
            <p>{copy.innerCircle.body1}</p>
            <p className="mt-3">{copy.innerCircle.body2}</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-fg">
              {copy.expect.title}
            </h2>
            <ul className="space-y-2">
              {copy.expect.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="mt-px shrink-0 text-accent">
                    {LEGAL_COPY.shared.bulletGlyph}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-fg">
              {copy.data.title}
            </h2>
            <p>{copy.data.body1}</p>
            <p className="mt-3">{copy.data.body2}</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-fg">
              {copy.prices.title}
            </h2>
            <p>{copy.prices.body}</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-fg">
              {copy.feedback.title}
            </h2>
            <p>{copy.feedback.body}</p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-fg">
              {copy.fullTerms.title}
            </h2>
            <p>{copy.fullTerms.body}</p>
          </section>

          <section className="border-t border-border pt-8">
            <p className="text-sm text-fg-subtle">
              {copy.contact.intro}{' '}
              <a
                href={`mailto:${LEGAL_COPY.shared.supportEmail}`}
                className="text-fg-muted underline underline-offset-4 transition-colors hover:text-fg"
              >
                {copy.contact.emailLink}
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
