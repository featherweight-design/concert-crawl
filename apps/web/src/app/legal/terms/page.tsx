import type { Metadata } from 'next'
import Link from 'next/link'

import { LEGAL_COPY } from '../definitions/copy'

export const metadata: Metadata = {
  title: 'Terms of Service — Concert Crawl',
  robots: { index: false },
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-3 text-base font-bold text-fg">{title}</h2>
      <div className="space-y-3 text-fg-muted">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  const copy = LEGAL_COPY.terms

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
        <p className="mb-10 text-sm text-fg-muted">
          {LEGAL_COPY.shared.effectiveDate}
        </p>

        <div className="space-y-8 text-[15px] leading-relaxed">
          <Section title={copy.acceptance.title}>
            <p>{copy.acceptance.body1}</p>
            <p>{copy.acceptance.body2}</p>
          </Section>

          <Section title={copy.service.title}>
            <p>{copy.service.body1}</p>
            <p>{copy.service.body2}</p>
            <p>
              {copy.service.crawlerPrefix}
              <Link
                href={copy.service.crawlerHref}
                className="text-fg-muted underline underline-offset-4 transition-colors hover:text-fg"
              >
                {copy.service.crawlerLinkLabel}
              </Link>
              {copy.service.crawlerSuffix}
            </p>
          </Section>

          <Section title={copy.accounts.title}>
            <p>{copy.accounts.body1}</p>
            <p>{copy.accounts.body2}</p>
          </Section>

          <Section title={copy.userContent.title}>
            <p>{copy.userContent.body1}</p>
            <p>{copy.userContent.body2}</p>
          </Section>

          <Section title={copy.prohibited.title}>
            <p>{copy.prohibited.intro}</p>
            <ul className="space-y-1.5 pl-4">
              {copy.prohibited.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="mt-px shrink-0 text-accent">
                    {LEGAL_COPY.shared.bulletGlyph}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title={copy.intellectualProperty.title}>
            <p>{copy.intellectualProperty.body}</p>
          </Section>

          <Section title={copy.subscriptions.title}>
            <p>{copy.subscriptions.body1}</p>
            <p>{copy.subscriptions.body2}</p>
            <p>{copy.subscriptions.body3}</p>
            <div id="refunds" className="scroll-mt-8">
              <h3 className="mb-2 pt-2 text-[15px] font-bold text-fg">
                {copy.subscriptions.refundsTitle}
              </h3>
              <p>
                {copy.subscriptions.refundsBodyPrefix}{' '}
                <a
                  href={`mailto:${LEGAL_COPY.shared.supportEmail}`}
                  className="text-fg-muted underline underline-offset-4 transition-colors hover:text-fg"
                >
                  {LEGAL_COPY.shared.supportEmail}
                </a>{' '}
                {copy.subscriptions.refundsBodySuffix}
              </p>
            </div>
          </Section>

          <Section title={copy.disclaimers.title}>
            <p>{copy.disclaimers.body}</p>
          </Section>

          <Section title={copy.liability.title}>
            <p>{copy.liability.body}</p>
          </Section>

          <Section title={copy.termination.title}>
            <p>{copy.termination.body}</p>
          </Section>

          <Section title={copy.governingLaw.title}>
            <p>{copy.governingLaw.body}</p>
          </Section>

          <Section title={copy.contact.title}>
            <p>
              {copy.contact.intro}{' '}
              <a
                href={`mailto:${LEGAL_COPY.shared.supportEmail}`}
                className="text-fg-muted underline underline-offset-4 transition-colors hover:text-fg"
              >
                {LEGAL_COPY.shared.supportEmail}
              </a>
            </p>
          </Section>

          <div className="border-t border-border pt-6">
            <Link
              href="/legal/privacy"
              className="text-sm text-fg-muted underline underline-offset-4 transition-colors hover:text-fg"
            >
              {LEGAL_COPY.shared.privacyLink}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
